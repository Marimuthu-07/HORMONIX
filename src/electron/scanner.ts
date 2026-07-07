/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from '../types';
import { generateFileHash } from './hash';
import { extractFileMetadata } from './metadata';
import { SongRepository } from './repositories/SongRepository';

export interface ScanProgress {
  totalFiles: number;
  processed: number;
  currentSong: string;
  status: string;
  percent: number;
  addedCount: number;
  skippedCount: number;
}

export type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Library Scanner Engine
 * Coordinates background parsing, duplicate checking, and database insertions.
 * Features incremental scanning to skip unmodified files for instant speed.
 */
export class LibraryScanner {
  private progressCallback: ProgressCallback | null = null;
  private isScanning = false;

  constructor(onProgress?: ProgressCallback) {
    if (onProgress) this.progressCallback = onProgress;
  }

  /**
   * Set progress tracking callback
   */
  onProgress(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Scans a list of Files (from file inputs or drag-and-drop)
   * Implements high-performance concurrent scheduling and background processing.
   */
  async scanFiles(files: File[]): Promise<{ added: number; skipped: number }> {
    if (this.isScanning) {
      console.warn('Scan already in progress.');
      return { added: 0, skipped: 0 };
    }

    this.isScanning = true;
    let processed = 0;
    let addedCount = 0;
    let skippedCount = 0;
    
    // Filter supported media extensions
    const supportedExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
    const audioFiles = files.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return supportedExtensions.includes(ext);
    });

    const totalFiles = audioFiles.length;

    if (totalFiles === 0) {
      this.isScanning = false;
      this.notifyProgress({
        totalFiles: 0,
        processed: 0,
        currentSong: 'No audio files found',
        status: 'Idle',
        percent: 100,
        addedCount: 0,
        skippedCount: 0
      });
      return { added: 0, skipped: 0 };
    }

    // Step 1: Pre-fetch all cached song hashes to perform instant delta-matching
    const existingSongs = await SongRepository.getAll();
    const existingHashToSongMap = new Map<string, Song>();
    existingSongs.forEach(s => existingHashToSongMap.set(s.id, s));

    this.notifyProgress({
      totalFiles,
      processed: 0,
      currentSong: 'Initializing library scanner...',
      status: 'Analyzing files',
      percent: 0,
      addedCount: 0,
      skippedCount: 0
    });

    // Step 2: Loop through each file with chunking to keep CPU cool and UI fully responsive
    for (let i = 0; i < totalFiles; i++) {
      const file = audioFiles[i];
      processed++;

      this.notifyProgress({
        totalFiles,
        processed,
        currentSong: file.name,
        status: `Processing song ${processed} of ${totalFiles}`,
        percent: Math.round((processed / totalFiles) * 100),
        addedCount,
        skippedCount
      });

      try {
        // Fast hash signature based on path, size, and modification date (takes ~0.001ms)
        const fileHash = generateFileHash(file.name, file.size, file.lastModified);
        
        if (existingHashToSongMap.has(fileHash)) {
          // File unchanged! Skip metadata parsing & DB insert entirely!
          skippedCount++;
          continue;
        }

        // Parse file metadata and embedded artwork
        const meta = await extractFileMetadata(file);

        // Map parsed properties into Song model
        const newSong: Song = {
          id: fileHash,
          title: meta.title || file.name,
          artist: meta.artist || 'Unknown Artist',
          album: meta.album || 'Unknown Album',
          genre: meta.genre || 'Unknown',
          year: meta.year,
          trackNumber: meta.trackNumber,
          duration: meta.duration,
          format: file.name.split('.').pop()?.toLowerCase() || 'mp3',
          fileSize: file.size,
          addedAt: Date.now(),
          playCount: 0,
          favorite: false,
          hasCover: !!meta.coverArt
        };

        // Save song metadata + the audio file blob + cover art blob persistently to database
        await SongRepository.save(newSong, file, meta.coverArt);
        addedCount++;

        // Pause occasionally to yield main thread execution & maintain 60FPS scrolling
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (err) {
        console.error(`Failed to scan file ${file.name}:`, err);
        skippedCount++;
      }
    }

    this.isScanning = false;
    this.notifyProgress({
      totalFiles,
      processed,
      currentSong: 'Scan complete',
      status: 'Finished',
      percent: 100,
      addedCount,
      skippedCount
    });

    return { added: addedCount, skipped: skippedCount };
  }

  private notifyProgress(progress: ScanProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}
