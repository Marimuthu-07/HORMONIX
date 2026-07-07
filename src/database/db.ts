/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song, Playlist, PlaybackHistory, PlayerSettings } from '../types';

const DB_NAME = 'OfflineMusicPlayerDB';
const DB_VERSION = 1;

export class AppDatabase {
  private db: IDBDatabase | null = null;

  init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Songs table
        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'id' });
          songStore.createIndex('title', 'title', { unique: false });
          songStore.createIndex('artist', 'artist', { unique: false });
          songStore.createIndex('album', 'album', { unique: false });
          songStore.createIndex('addedAt', 'addedAt', { unique: false });
          songStore.createIndex('playCount', 'playCount', { unique: false });
          songStore.createIndex('favorite', 'favorite', { unique: false });
        }

        // 2. Playlists table
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }

        // 3. Playlist Songs joining table
        if (!db.objectStoreNames.contains('playlist_songs')) {
          const playlistSongStore = db.createObjectStore('playlist_songs', { keyPath: 'id', autoIncrement: true });
          playlistSongStore.createIndex('playlistId', 'playlistId', { unique: false });
          playlistSongStore.createIndex('songId', 'songId', { unique: false });
          playlistSongStore.createIndex('playlistId_songId', ['playlistId', 'songId'], { unique: false });
        }

        // 4. Playback History table
        if (!db.objectStoreNames.contains('playback_history')) {
          const historyStore = db.createObjectStore('playback_history', { keyPath: 'id' });
          historyStore.createIndex('playedAt', 'playedAt', { unique: false });
          historyStore.createIndex('songId', 'songId', { unique: false });
        }

        // 5. Settings table (key-value)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 6. Song Blobs table (storing real offline audio files)
        if (!db.objectStoreNames.contains('song_blobs')) {
          db.createObjectStore('song_blobs', { keyPath: 'songId' });
        }

        // 7. Album Art Blobs table (storing extracted cover thumbnails)
        if (!db.objectStoreNames.contains('cover_art_blobs')) {
          db.createObjectStore('cover_art_blobs', { keyPath: 'songId' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // --- SONGS CRUD ---

  async getAllSongs(): Promise<Song[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('songs', 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSong(song: Song, audioBlob?: Blob, coverArtBlob?: Blob): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const stores = ['songs'];
      if (audioBlob) stores.push('song_blobs');
      if (coverArtBlob) stores.push('cover_art_blobs');

      const transaction = db.transaction(stores, 'readwrite');
      
      const songStore = transaction.objectStore('songs');
      songStore.put(song);

      if (audioBlob) {
        const blobStore = transaction.objectStore('song_blobs');
        blobStore.put({ songId: song.id, blob: audioBlob });
      }

      if (coverArtBlob) {
        const coverStore = transaction.objectStore('cover_art_blobs');
        coverStore.put({ songId: song.id, blob: coverArtBlob });
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSongAudio(songId: string): Promise<Blob | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('song_blobs', 'readonly');
      const store = transaction.objectStore('song_blobs');
      const request = store.get(songId);

      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSongCoverArt(songId: string): Promise<Blob | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cover_art_blobs', 'readonly');
      const store = transaction.objectStore('cover_art_blobs');
      const request = store.get(songId);

      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSong(songId: string): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['songs', 'song_blobs', 'cover_art_blobs'], 'readwrite');
      
      transaction.objectStore('songs').delete(songId);
      transaction.objectStore('song_blobs').delete(songId);
      transaction.objectStore('cover_art_blobs').delete(songId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- PLAYLISTS CRUD ---

  async getAllPlaylists(): Promise<Playlist[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('playlists', 'readonly');
      const store = transaction.objectStore('playlists');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePlaylist(playlist: Playlist): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('playlists', 'readwrite');
      const store = transaction.objectStore('playlists');
      store.put(playlist);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['playlists', 'playlist_songs'], 'readwrite');
      
      transaction.objectStore('playlists').delete(playlistId);
      
      // Delete all entries in playlist_songs for this playlist
      const playlistSongStore = transaction.objectStore('playlist_songs');
      const index = playlistSongStore.index('playlistId');
      const request = index.openCursor(IDBKeyRange.only(playlistId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPlaylistSongs(playlistId: string): Promise<string[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('playlist_songs', 'readonly');
      const store = transaction.objectStore('playlist_songs');
      const index = store.index('playlistId');
      const request = index.getAll(IDBKeyRange.only(playlistId));

      request.onsuccess = () => {
        const sorted = request.result.sort((a, b) => a.position - b.position);
        resolve(sorted.map(item => item.songId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
    const db = await this.init();
    const songs = await this.getPlaylistSongs(playlistId);
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('playlist_songs', 'readwrite');
      const store = transaction.objectStore('playlist_songs');
      
      store.put({
        playlistId,
        songId,
        position: songs.length
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('playlist_songs', 'readwrite');
      const store = transaction.objectStore('playlist_songs');
      const index = store.index('playlistId_songId');
      const request = index.openCursor(IDBKeyRange.only([playlistId, songId]));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- SETTINGS CRUD ---

  async getSettings(): Promise<Partial<PlayerSettings>> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();

      request.onsuccess = () => {
        const settings: Partial<PlayerSettings> = {};
        request.result.forEach((item) => {
          (settings as any)[item.key] = item.value;
        });
        resolve(settings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key, value });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- HISTORY CRUD ---

  async getPlaybackHistory(limit = 100): Promise<PlaybackHistory[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('playback_history', 'readonly');
      const store = transaction.objectStore('playback_history');
      const index = store.index('playedAt');
      const request = index.openCursor(null, 'prev'); // sort descending by time

      const history: PlaybackHistory[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && history.length < limit) {
          history.push(cursor.value);
          cursor.continue();
        } else {
          resolve(history);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addHistoryEntry(songId: string): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['playback_history', 'songs'], 'readwrite');
      
      // Add to history
      const historyStore = transaction.objectStore('playback_history');
      const id = `${songId}_${Date.now()}`;
      historyStore.put({
        id,
        songId,
        playedAt: Date.now()
      });

      // Increment play count in song metadata
      const songStore = transaction.objectStore('songs');
      const songReq = songStore.get(songId);
      songReq.onsuccess = () => {
        const song: Song = songReq.result;
        if (song) {
          song.playCount = (song.playCount || 0) + 1;
          song.lastPlayedAt = Date.now();
          songStore.put(song);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearDatabase(): Promise<void> {
    const db = await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        ['songs', 'playlists', 'playlist_songs', 'playback_history', 'settings', 'song_blobs', 'cover_art_blobs'],
        'readwrite'
      );
      
      transaction.objectStore('songs').clear();
      transaction.objectStore('playlists').clear();
      transaction.objectStore('playlist_songs').clear();
      transaction.objectStore('playback_history').clear();
      transaction.objectStore('settings').clear();
      transaction.objectStore('song_blobs').clear();
      transaction.objectStore('cover_art_blobs').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const db = new AppDatabase();
