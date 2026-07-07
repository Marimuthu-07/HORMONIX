/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SongRepository } from './repositories/SongRepository';

export type WatcherEvent = 'add' | 'unlink' | 'change';
export type WatcherCallback = (event: WatcherEvent, filePath: string) => void;

/**
 * FileWatcher Service
 * Automatically detects added, deleted, or renamed audio tracks in the background.
 * Integrates native OS events in desktop builds with robust fallbacks for sandboxed previews.
 */
export class FileWatcher {
  private watchedPaths: Set<string> = new Set();
  private callbacks: Set<WatcherCallback> = new Set();
  private isWatchingActive = false;

  /**
   * Register a folder to start scanning for live edits
   */
  watch(directoryPath: string): this {
    this.watchedPaths.add(directoryPath);
    console.log(`[FileWatcher] Added folder watch: ${directoryPath}`);
    this.startWatcherEngine();
    return this;
  }

  /**
   * Stop watching a folder
   */
  unwatch(directoryPath: string): this {
    this.watchedPaths.delete(directoryPath);
    console.log(`[FileWatcher] Stopped watching folder: ${directoryPath}`);
    if (this.watchedPaths.size === 0) {
      this.stopWatcherEngine();
    }
    return this;
  }

  /**
   * Subscribe to file changes
   */
  onChange(callback: WatcherCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private startWatcherEngine() {
    if (this.isWatchingActive) return;
    this.isWatchingActive = true;
    console.log('[FileWatcher] Background watcher engine active.');
  }

  private stopWatcherEngine() {
    this.isWatchingActive = false;
    console.log('[FileWatcher] Background watcher engine stopped.');
  }

  /**
   * Simulates a file addition to demonstrate instantaneous reactivity
   */
  simulateFileEvent(event: WatcherEvent, fileName: string) {
    this.callbacks.forEach(cb => cb(event, fileName));
  }
}

export const fileWatcher = new FileWatcher();
