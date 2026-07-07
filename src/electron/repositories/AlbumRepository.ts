/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from '../../types';
import { SongRepository } from './SongRepository';

export interface Album {
  title: string;
  artist: string;
  songCount: number;
  year?: number;
  songs: Song[];
  coverArtSongId?: string; // ID of the song to query cover art for this album
}

/**
 * AlbumRepository
 * Standardizes index query mappings for Music Albums, ensuring efficient grouping of tracks.
 */
export const AlbumRepository = {
  /**
   * Compiles and retrieves all unique albums from the active library
   */
  async getAll(): Promise<Album[]> {
    const songs = await SongRepository.getAll();
    const albumMap = new Map<string, Album>();

    songs.forEach((song) => {
      const albumTitle = song.album || 'Unknown Album';
      const albumArtist = song.artist || 'Unknown Artist';
      
      // Use a unique compound key for artist + album to distinguish different albums with the same name
      const compoundKey = `${albumArtist.toLowerCase()}||${albumTitle.toLowerCase()}`;

      if (!albumMap.has(compoundKey)) {
        albumMap.set(compoundKey, {
          title: albumTitle,
          artist: albumArtist,
          songCount: 0,
          songs: [],
          year: song.year,
          coverArtSongId: song.hasCover ? song.id : undefined
        });
      }

      const album = albumMap.get(compoundKey)!;
      album.songCount++;
      album.songs.push(song);
      
      // Keep track of the earliest release year found for tracks on this album
      if (song.year && (!album.year || song.year < album.year)) {
        album.year = song.year;
      }

      // Try to assign the cover art from any track that actually has it
      if (song.hasCover && !album.coverArtSongId) {
        album.coverArtSongId = song.id;
      }
    });

    // Sort tracks inside each album by track number or title
    albumMap.forEach((album) => {
      album.songs.sort((a, b) => {
        if (a.trackNumber && b.trackNumber) return a.trackNumber - b.trackNumber;
        return a.title.localeCompare(b.title);
      });
    });

    return Array.from(albumMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Retrieves a single album matching title and artist
   */
  async findByTitleAndArtist(title: string, artist: string): Promise<Album | null> {
    const albums = await this.getAll();
    const compoundKey = `${artist.toLowerCase()}||${title.toLowerCase()}`;
    return albums.find(a => `${a.artist.toLowerCase()}||${a.title.toLowerCase()}` === compoundKey) || null;
  }
};
