/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Song } from '../types';
import { Album } from '../electron/repositories/AlbumRepository';
import { Artist } from '../electron/repositories/ArtistRepository';
import { Playlist } from '../types';

export type ActiveView = 
  | 'home'
  | 'library' 
  | 'albums' 
  | 'artists' 
  | 'playlists' 
  | 'favorites' 
  | 'search' 
  | 'queue' 
  | 'settings'
  | 'history';

interface ScanStatus {
  totalFiles: number;
  processed: number;
  currentSong: string;
  status: string;
  percent: number;
  isScanning: boolean;
}

interface AppState {
  activeView: ActiveView;
  selectedAlbum: Album | null;
  selectedArtist: Artist | null;
  selectedPlaylist: Playlist | null;
  searchQuery: string;
  scanStatus: ScanStatus;
  isDrawerOpen: boolean;

  setView: (view: ActiveView) => void;
  selectAlbum: (album: Album | null) => void;
  selectArtist: (artist: Artist | null) => void;
  selectPlaylist: (playlist: Playlist | null) => void;
  setSearchQuery: (query: string) => void;
  updateScanStatus: (status: Partial<ScanStatus>) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'home',
  selectedAlbum: null,
  selectedArtist: null,
  selectedPlaylist: null,
  searchQuery: '',
  scanStatus: {
    totalFiles: 0,
    processed: 0,
    currentSong: '',
    status: 'Idle',
    percent: 0,
    isScanning: false,
  },
  isDrawerOpen: false,

  setView: (view) => set({ 
    activeView: view, 
    selectedAlbum: null, 
    selectedArtist: null, 
    selectedPlaylist: null 
  }),
  selectAlbum: (album) => set({ selectedAlbum: album, selectedArtist: null, selectedPlaylist: null }),
  selectArtist: (artist) => set({ selectedArtist: artist, selectedAlbum: null, selectedPlaylist: null }),
  selectPlaylist: (playlist) => set({ selectedPlaylist: playlist, selectedAlbum: null, selectedArtist: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  updateScanStatus: (status) => set((state) => ({ scanStatus: { ...state.scanStatus, ...status } })),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
}));
