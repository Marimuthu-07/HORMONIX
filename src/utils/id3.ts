// Client-side pure TypeScript ID3v2 audio metadata parser
// Parses ID3 v2.3 and v2.4 tags directly from audio files to extract Album Art (APIC), Title, Artist, and Album.

export interface ParsedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  format: string;
  sampleRate?: string;
  bitDepth?: string;
  size?: string;
}

export async function parseAudioMetadata(file: File): Promise<ParsedMetadata> {
  const extension = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

  // Default values from filename
  const filenameNoExt = file.name.replace(/\.[^/.]+$/, "");
  const parts = filenameNoExt.split(' - ');
  let title = filenameNoExt;
  let artist = 'Offline Artist';
  let album = 'Local Disk';

  if (parts.length > 1) {
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  const result: ParsedMetadata = {
    title,
    artist,
    album,
    format: extension,
    size: sizeMB,
    // Add realistic defaults based on typical high-res formats
    sampleRate: extension === 'FLAC' || extension === 'WAV' ? '48.0 kHz' : '44.1 kHz',
    bitDepth: extension === 'FLAC' ? '24-bit' : extension === 'WAV' ? '24-bit' : '16-bit',
  };

  try {
    // Read first 1MB of the file where ID3 headers reside
    const headerBuffer = await readSlice(file, 0, 1024 * 1024);
    const view = new DataView(headerBuffer);

    // Verify ID3 Header ("ID3" at bytes 0-2)
    if (
      view.getUint8(0) === 0x49 && // 'I'
      view.getUint8(1) === 0x44 && // 'D'
      view.getUint8(2) === 0x33    // '3'
    ) {
      const majorVersion = view.getUint8(3); // e.g. 3 or 4 for v2.3 or v2.4
      const sizeBytes = [view.getUint8(6), view.getUint8(7), view.getUint8(8), view.getUint8(9)];
      
      // ID3 size is "synchsafe" (7 bits per byte)
      const tagSize =
        (sizeBytes[0] << 21) |
        (sizeBytes[1] << 14) |
        (sizeBytes[2] << 7) |
        sizeBytes[3];

      let offset = 10; // Start of frames
      const endOffset = Math.min(tagSize + 10, headerBuffer.byteLength);

      while (offset + 10 < endOffset) {
        // Read Frame ID (4 characters)
        const frameIdBytes = new Uint8Array(headerBuffer, offset, 4);
        const frameId = String.fromCharCode(...frameIdBytes);

        // Sanity check frame ID (A-Z, 0-9)
        if (!/^[A-Z0-9]{4}$/.test(frameId)) {
          break; // Corrupted frame or end of tags
        }

        // Read Frame Size (4 bytes)
        let frameSize = 0;
        if (majorVersion === 4) {
          // ID3v2.4 frame sizes are synchsafe
          frameSize =
            (view.getUint8(offset + 4) << 21) |
            (view.getUint8(offset + 5) << 14) |
            (view.getUint8(offset + 6) << 7) |
            view.getUint8(offset + 7);
        } else {
          // ID3v2.3 standard big-endian
          frameSize = view.getUint32(offset + 4);
        }

        // Safety limit list sizing
        if (frameSize <= 0 || offset + 10 + frameSize > headerBuffer.byteLength) {
          break;
        }

        const dataOffset = offset + 10;

        if (frameId === 'TIT2') {
          result.title = decodeTextFrame(headerBuffer, dataOffset, frameSize);
        } else if (frameId === 'TPE1') {
          result.artist = decodeTextFrame(headerBuffer, dataOffset, frameSize);
        } else if (frameId === 'TALB') {
          result.album = decodeTextFrame(headerBuffer, dataOffset, frameSize);
        } else if (frameId === 'APIC') {
          const art = decodeAPICFrame(headerBuffer, dataOffset, frameSize);
          if (art?.coverUrl) {
            result.coverUrl = art.coverUrl;
          }
        }

        offset += 10 + frameSize;
      }
    }
  } catch (error) {
    console.warn("Failed to parse metadata: ", error);
  }

  return result;
}

function readSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(start, end));
  });
}

function decodeTextFrame(buffer: ArrayBuffer, offset: number, size: number): string {
  if (size <= 1) return "";
  const encoding = new DataView(buffer, offset, 1).getUint8(0);
  const data = new Uint8Array(buffer, offset + 1, size - 1);
  return decodeString(data, encoding).trim();
}

function decodeString(data: Uint8Array, encoding: number): string {
  let decoderType = 'utf-8';
  let cleanData = data;

  if (encoding === 0) {
    decoderType = 'iso-8859-1';
  } else if (encoding === 1) {
    decoderType = 'utf-16';
    // Trim BOM if present (FF FE or FE FF)
    if (data.length >= 2) {
      if ((data[0] === 0xFF && data[1] === 0xFE) || (data[0] === 0xFE && data[1] === 0xFF)) {
        cleanData = data.slice(2);
      }
    }
  } else if (encoding === 2) {
    decoderType = 'utf-16be';
  } else if (encoding === 3) {
    decoderType = 'utf-8';
  }

  try {
    const decoder = new TextDecoder(decoderType);
    const decoded = decoder.decode(cleanData);
    // Strip trailing null characters common in tags
    return decoded.replace(/\0+$/, '');
  } catch (err) {
    // Fallback simple translation
    return String.fromCharCode(...cleanData).replace(/\0+$/, '');
  }
}

interface APICResult {
  mime?: string;
  coverUrl?: string;
}

function decodeAPICFrame(buffer: ArrayBuffer, offset: number, size: number): APICResult | null {
  if (size <= 5) return null;
  const view = new DataView(buffer, offset, size);
  const encoding = view.getUint8(0);

  let currentOffset = 1;

  // Read MIME type (ASCII null terminated)
  let mime = "";
  while (currentOffset < size) {
    const charCode = view.getUint8(currentOffset);
    if (charCode === 0) {
      currentOffset++;
      break;
    }
    mime += String.fromCharCode(charCode);
    currentOffset++;
  }

  // Picture Type (1 byte)
  const pictureType = view.getUint8(currentOffset);
  currentOffset++;

  // Description (null terminated text frame depending on encoding)
  // Let's scan for null terminator based on encoding
  if (encoding === 1 || encoding === 2) {
    // 16-bit characters scan for double zeros
    while (currentOffset + 1 < size) {
      if (view.getUint8(currentOffset) === 0 && view.getUint8(currentOffset + 1) === 0) {
        currentOffset += 2;
        break;
      }
      currentOffset += 2;
    }
  } else {
    // 8-bit characters scan for single zero
    while (currentOffset < size) {
      if (view.getUint8(currentOffset) === 0) {
        currentOffset++;
        break;
      }
      currentOffset++;
    }
  }

  // The rest is image data
  if (currentOffset < size) {
    const imageDataBytes = new Uint8Array(buffer, offset + currentOffset, size - currentOffset);
    try {
      const blob = new Blob([imageDataBytes], { type: mime || 'image/jpeg' });
      const coverUrl = URL.createObjectURL(blob);
      return { mime, coverUrl };
    } catch (e) {
      console.error("Failed to build image blob", e);
    }
  }

  return null;
}
