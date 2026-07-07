/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from '../types';

/**
 * Pure TypeScript metadata and ID3v2 parser.
 * Designed to be highly performant, zero-dependency, and fully compatible with both Web Workers and Node.js.
 */
export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  codec: string;
  coverArt?: Blob;
  fileSize?: number;
}

// Decode text according to ID3 encoding rules
function decodeText(buffer: Uint8Array, encoding: number): string {
  if (encoding === 0) {
    // ISO-8859-1 (Latin1) - convert directly
    let str = '';
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) break;
      str += String.fromCharCode(buffer[i]);
    }
    return str.trim();
  } else if (encoding === 1) {
    // UTF-16 with BOM
    if (buffer.length < 2) return '';
    const hasBOM = (buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff);
    const littleEndian = buffer[0] === 0xff && buffer[1] === 0xfe;
    
    const start = hasBOM ? 2 : 0;
    const chars: string[] = [];
    for (let i = start; i < buffer.length - 1; i += 2) {
      const code = littleEndian 
        ? buffer[i] | (buffer[i + 1] << 8)
        : (buffer[i] << 8) | buffer[i + 1];
      if (code === 0) break;
      chars.push(String.fromCharCode(code));
    }
    return chars.join('').trim();
  } else if (encoding === 3) {
    // UTF-8
    try {
      const decoder = new TextDecoder('utf-8');
      // Find null terminator
      let end = buffer.indexOf(0);
      if (end === -1) end = buffer.length;
      return decoder.decode(buffer.subarray(0, end)).trim();
    } catch {
      // Fallback to basic ascii
      let str = '';
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) break;
        str += String.fromCharCode(buffer[i]);
      }
      return str.trim();
    }
  }
  return '';
}

/**
 * Parses ID3v2 metadata from an ArrayBuffer
 */
export function parseID3v2(arrayBuffer: ArrayBuffer): Partial<ExtractedMetadata> {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 10) return {};

  // Check ID3 header
  const isID3 = view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33;
  if (!isID3) return {};

  const majorVersion = view.getUint8(3);
  const _revision = view.getUint8(4);
  const _flags = view.getUint8(5);

  // Get synchsafe size of ID3 header
  const sizeBytes = [view.getUint8(6), view.getUint8(7), view.getUint8(8), view.getUint8(9)];
  const tagSize = (sizeBytes[0] << 21) | (sizeBytes[1] << 14) | (sizeBytes[2] << 7) | sizeBytes[3];

  const metadata: Partial<ExtractedMetadata> = {};
  let offset = 10;
  const tagEnd = Math.min(offset + tagSize, arrayBuffer.byteLength);

  // Loop through frames
  while (offset < tagEnd - 10) {
    // Frame ID must be 4 characters (capital letters and numbers)
    let frameId = '';
    for (let i = 0; i < 4; i++) {
      const charCode = view.getUint8(offset + i);
      if (charCode < 32 || charCode > 126) break;
      frameId += String.fromCharCode(charCode);
    }

    if (frameId.length !== 4) {
      break; // Invalid frame ID, stop parsing
    }

    // Frame size (ID3v2.3 vs ID3v2.4 size)
    let frameSize = 0;
    if (majorVersion === 4) {
      // Synchsafe integer in ID3v2.4
      const fSizeB = [
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      ];
      frameSize = (fSizeB[0] << 21) | (fSizeB[1] << 14) | (fSizeB[2] << 7) | fSizeB[3];
    } else {
      // Standard 32-bit int in ID3v2.3
      frameSize = view.getUint32(offset + 4);
    }

    if (frameSize <= 0 || offset + 10 + frameSize > tagEnd) {
      break; // Size error, abort
    }

    const frameData = new Uint8Array(arrayBuffer, offset + 10, frameSize);

    try {
      if (frameId === 'TIT2') {
        // Title
        metadata.title = decodeText(frameData.subarray(1), frameData[0]);
      } else if (frameId === 'TPE1') {
        // Lead artist
        metadata.artist = decodeText(frameData.subarray(1), frameData[0]);
      } else if (frameId === 'TALB') {
        // Album
        metadata.album = decodeText(frameData.subarray(1), frameData[0]);
      } else if (frameId === 'TPE2') {
        // Album artist
        metadata.albumArtist = decodeText(frameData.subarray(1), frameData[0]);
      } else if (frameId === 'TCON') {
        // Genre
        metadata.genre = decodeText(frameData.subarray(1), frameData[0]);
      } else if (frameId === 'TYER' || frameId === 'TDRC') {
        // Year
        const yearStr = decodeText(frameData.subarray(1), frameData[0]);
        const year = parseInt(yearStr.substring(0, 4), 10);
        if (!isNaN(year)) metadata.year = year;
      } else if (frameId === 'TRCK') {
        // Track number
        const trackStr = decodeText(frameData.subarray(1), frameData[0]);
        const track = parseInt(trackStr.split('/')[0], 10);
        if (!isNaN(track)) metadata.trackNumber = track;
      } else if (frameId === 'TPOS') {
        // Disc number
        const discStr = decodeText(frameData.subarray(1), frameData[0]);
        const disc = parseInt(discStr.split('/')[0], 10);
        if (!isNaN(disc)) metadata.discNumber = disc;
      } else if (frameId === 'APIC') {
        // Embedded Album Art (Attached Picture)
        const encoding = frameData[0];
        
        // Find mime type
        let mimeTypeEnd = 1;
        while (mimeTypeEnd < frameData.length && frameData[mimeTypeEnd] !== 0) {
          mimeTypeEnd++;
        }
        const mimeType = new TextDecoder('ascii').decode(frameData.subarray(1, mimeTypeEnd));
        
        const pictureType = frameData[mimeTypeEnd + 1];
        
        // Description
        let descEnd = mimeTypeEnd + 2;
        if (encoding === 1) {
          // UTF-16 description ends with two null bytes
          while (descEnd < frameData.length - 1 && !(frameData[descEnd] === 0 && frameData[descEnd + 1] === 0)) {
            descEnd += 2;
          }
          descEnd += 2;
        } else {
          // Latin1/UTF-8 description ends with single null byte
          while (descEnd < frameData.length && frameData[descEnd] !== 0) {
            descEnd++;
          }
          descEnd += 1;
        }

        const pictureData = frameData.subarray(descEnd);
        if (pictureData.length > 0) {
          metadata.coverArt = new Blob([pictureData], { type: mimeType || 'image/jpeg' });
        }
      }
    } catch (e) {
      console.warn(`Error parsing ID3 frame ${frameId}:`, e);
    }

    offset += 10 + frameSize;
  }

  return metadata;
}

/**
 * Fallback parser to generate metadata from filename if tags are missing
 */
export function getMetadataFromFilename(filename: string): Partial<ExtractedMetadata> {
  // Strip extension
  const cleanName = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Try splitting by " - " (Artist - Title)
  const parts = cleanName.split(' - ');
  if (parts.length >= 2) {
    return {
      title: parts.slice(1).join(' - ').trim(),
      artist: parts[0].trim(),
      album: 'Unknown Album',
      genre: 'Unknown'
    };
  }
  
  return {
    title: cleanName.trim(),
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    genre: 'Unknown'
  };
}

/**
 * Orchestrates metadata parsing for an audio File
 */
export async function extractFileMetadata(file: File): Promise<ExtractedMetadata> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  const result: ExtractedMetadata = {
    title: file.name,
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    genre: 'Unknown',
    duration: 0,
    codec: extension.toUpperCase(),
    fileSize: file.size
  };

  // Step 1: Parse ID3v2 for MP3 files
  if (extension === 'mp3') {
    try {
      // Read first 1MB of the file for tags to be ultra-fast
      const headerBlob = file.slice(0, 1024 * 1024);
      const arrayBuffer = await headerBlob.arrayBuffer();
      const id3Data = parseID3v2(arrayBuffer);
      
      Object.assign(result, id3Data);
    } catch (e) {
      console.error('Failed to parse ID3 tags:', e);
    }
  }

  // Step 2: Fallback to filename parser if tags are missing or empty
  if (result.title === file.name || !result.title || result.artist === 'Unknown Artist') {
    const filenameMeta = getMetadataFromFilename(file.name);
    if (result.title === file.name || !result.title) result.title = filenameMeta.title || result.title;
    if (result.artist === 'Unknown Artist') result.artist = filenameMeta.artist || result.artist;
    if (result.album === 'Unknown Album') result.album = filenameMeta.album || result.album;
    if (result.genre === 'Unknown') result.genre = filenameMeta.genre || result.genre;
  }

  // Step 3: Extract Audio Duration
  // We can measure the duration quickly in the background using HTML5 Audio
  try {
    result.duration = await getAudioDuration(file);
  } catch (e) {
    console.warn(`Could not measure duration for ${file.name}:`, e);
    result.duration = 180; // default to 3 minutes fallback
  }

  return result;
}

/**
 * Gets the exact duration of an audio file using HTML5 Audio context / elements
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(objectUrl);
    });

    audio.addEventListener('error', () => {
      // Try using web audio context as second fallback, or just default
      resolve(0);
      URL.revokeObjectURL(objectUrl);
    });

    // Timeout safety
    setTimeout(() => {
      resolve(0);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }, 4000);
  });
}
