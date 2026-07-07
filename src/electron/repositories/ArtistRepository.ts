/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from '../../types';
import { SongRepository } from './SongRepository';

export interface Artist {
  name: string;
  songCount: number;
  albumCount: number;
  albums: string[];
  songs: Song[];
}

/**
 * ArtistRepository
 * Handles scanning, indexing, and retrieving artist information compiled dynamically from the song library.
 */
export const ArtistRepository = {
  /**
   * Retrieves a compiled index of all artists in the library
   */
  async getAll(): Promise<Artist[]> {
    const songs = await SongRepository.getAll();
    const artistMap = new Map<string, Artist>();

    songs.forEach((song) => {
      const artistName = song.artist || 'Unknown Artist';
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          name: artistName,
          songCount: 0,
          albumCount: 0,
          albums: [],
          songs: []
        });
      }

      const artist = artistMap.get(artistName)!;
      artist.songCount++;
      artist.songs.push(song);
      
      if (song.album && !artist.albums.includes(song.album)) {
        artist.albums.push(song.album);
      }
    });

    // Finalize counts
    artistMap.forEach((artist) => {
      artist.albumCount = artist.albums.length;
    });

    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Finds artist details and all associated songs by artist name
   */
  async findByName(name: string): Promise<Artist | null> {
    const artists = await this.getAll();
    return artists.find((a) => a.name.toLowerCase() === name.toLowerCase()) || null;
  }
};
