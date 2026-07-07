/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Disc, 
  Users, 
  ListMusic, 
  Heart, 
  History as HistoryIcon, 
  Plus, 
  FolderClosed, 
  RefreshCw, 
  Play, 
  Calendar, 
  Clock, 
  Database, 
  Sparkles, 
  Upload, 
  Trash2,
  Check
} from 'lucide-react';
import { useAppStore, ActiveView } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useToastStore } from '../common/Toast';
import { db } from '../../database/db';
import { Song, Playlist } from '../../types';
import { Album, AlbumRepository } from '../../electron/repositories/AlbumRepository';
import { Artist, ArtistRepository } from '../../electron/repositories/ArtistRepository';
import { SongRepository } from '../../electron/repositories/SongRepository';
import { CoverArt } from '../common/CoverArt';
import { LibraryScanner } from '../../electron/scanner';

// Predefined royalty-free pleasant high-fidelity synthetic songs
const MOCK_SCAN_DATABASE_SONGS = [
  { title: "Naa Ready", artist: "Anirudh Ravichander", album: "Leo", genre: "Tamil Pop", duration: 248, year: 2023, trackNumber: 1 },
  { title: "Badass", artist: "Anirudh Ravichander", album: "Leo", genre: "Tamil Pop", duration: 229, year: 2023, trackNumber: 2 },
  { title: "Chaiyya Chaiyya", artist: "A.R. Rahman", album: "Dil Se", genre: "Bollywood Classic", duration: 252, year: 1998, trackNumber: 1 },
  { title: "Dil Se Re", artist: "A.R. Rahman", album: "Dil Se", genre: "Bollywood Classic", duration: 305, year: 1998, trackNumber: 2 },
  { title: "Midnight Coffee", artist: "Lofi Beats", album: "Chilled Cow", genre: "Lofi / Chill", duration: 165, year: 2022, trackNumber: 1 },
  { title: "Rainy Sunday", artist: "Lofi Beats", album: "Chilled Cow", genre: "Lofi / Chill", duration: 190, year: 2022, trackNumber: 2 },
  { title: "Sunset Drive", artist: "Lofi Beats", album: "Chilled Cow", genre: "Lofi / Chill", duration: 150, year: 2022, trackNumber: 3 },
  { title: "Get Lucky", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic / Funk", duration: 369, year: 2013, trackNumber: 5 },
  { title: "Instant Crush", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic / Indie", duration: 337, year: 2013, trackNumber: 6 },
  { title: "Vikram Title Track", artist: "Anirudh Ravichander", album: "Vikram", genre: "Tamil Soundtrack", duration: 195, year: 2022, trackNumber: 1 },
  { title: "Once Upon a Time", artist: "Anirudh Ravichander", album: "Vikram", genre: "Tamil Soundtrack", duration: 144, year: 2022, trackNumber: 2 },
  { title: "Chinnanjiru Nilave", artist: "A.R. Rahman", album: "Ponniyin Selvan 2", genre: "Tamil Melodic", duration: 215, year: 2023, trackNumber: 3 }
];

export const Home: React.FC = () => {
  const { setView, selectAlbum, selectArtist, selectPlaylist, updateScanStatus, scanStatus } = useAppStore();
  const { playSong, setQueue } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();
  
  const { libraryLocations, updateSetting } = useSettingsStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allSongs = await db.getAllSongs();
      setSongs(allSongs);

      const allAlbums = await AlbumRepository.getAll();
      setAlbums(allAlbums);

      const allArtists = await ArtistRepository.getAll();
      setArtists(allArtists);

      const allPlaylists = await db.getAllPlaylists();
      setPlaylists(allPlaylists);

      const playbackHistory = await db.getPlaybackHistory(10);
      setHistory(playbackHistory);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Automated background scanner simulation
  const runBackgroundScan = async (foldersToScan = libraryLocations) => {
    if (foldersToScan.length === 0) return;
    
    updateScanStatus({ isScanning: true, percent: 0, status: 'Initializing automatic scan...' });
    
    // Pick folders to simulate
    const totalSimulatedTracks = MOCK_SCAN_DATABASE_SONGS.length;
    
    for (let i = 0; i < totalSimulatedTracks; i++) {
      const item = MOCK_SCAN_DATABASE_SONGS[i];
      const pct = Math.round(((i + 1) / totalSimulatedTracks) * 100);
      
      updateScanStatus({
        percent: pct,
        status: `Scanning folder changes...`,
        currentSong: `${item.artist} - ${item.title}`
      });

      // Save to DB
      const songId = `sim_${item.artist.replace(/\s+/g, '_')}_${item.title.replace(/\s+/g, '_')}`.toLowerCase();
      
      // Only insert if it doesn't exist
      const existing = await SongRepository.findById(songId);
      if (!existing) {
        const newSong: Song = {
          id: songId,
          title: item.title,
          artist: item.artist,
          album: item.album,
          genre: item.genre,
          year: item.year,
          trackNumber: item.trackNumber,
          duration: item.duration,
          format: 'mp3',
          fileSize: 4 * 1024 * 1024,
          addedAt: Date.now(),
          playCount: 0,
          favorite: false,
          hasCover: false
        };
        await SongRepository.save(newSong);
      }
      
      // yield thread slightly to simulate work
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    updateScanStatus({ isScanning: false, percent: 100, status: 'Scan complete' });
    showToast(`Background library scan completed. Found and synchronized songs.`, 'success');
    loadData();
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = newFolderName.trim();
    const updated = [...(libraryLocations || []), path];
    await updateSetting('libraryLocations', updated);
    setNewFolderName('');
    setShowAddFolderModal(false);
    showToast(`Added folder location: ${path}`, 'success');
    
    // Automatically run scanner on newly added folder!
    runBackgroundScan(updated);
  };

  const handleRemoveFolder = async (path: string) => {
    const updated = (libraryLocations || []).filter(p => p !== path);
    await updateSetting('libraryLocations', updated);
    showToast(`Removed folder location`, 'info');
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const id = `playlist_${Date.now()}`;
      await db.savePlaylist({
        id,
        name: newPlaylistName.trim(),
        createdAt: Date.now(),
        isSmart: false
      });
      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);
      showToast('Playlist created successfully!', 'success');
      loadData();
    } catch (err) {
      showToast('Failed to create playlist', 'error');
    }
  };

  const handleManualFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    updateScanStatus({ isScanning: true, percent: 0, status: 'Importing tracks...' });
    showToast(`Importing ${files.length} audio files...`, 'info');

    try {
      const scanner = new LibraryScanner((progress) => {
        updateScanStatus({
          processed: progress.processed,
          totalFiles: progress.totalFiles,
          currentSong: progress.currentSong,
          percent: progress.percent,
          status: progress.status,
          isScanning: progress.percent < 100
        });
      });
      await scanner.scanFiles(files as File[]);
      showToast(`Successfully imported ${files.length} songs.`, 'success');
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Error occurred during file importation', 'error');
    } finally {
      updateScanStatus({ isScanning: false });
    }
  };

  const handlePlaySong = async (song: Song) => {
    setQueue([song]);
    setCurrentSong(song);
    try {
      await useAudioEngine().playSong(song);
    } catch {}
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
  };

  // Generate Greeting greeting based on current local hours
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning 👋';
    if (hours < 18) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  };

  // Welcome Screen if library has no songs
  if (!loading && songs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto" id="welcome-screen">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/40 border border-white/5 rounded-3xl p-10 backdrop-blur-xl w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-6 animate-pulse" />
          
          <h1 className="text-3xl font-black text-zinc-100 tracking-tight mb-2">🎵 Welcome to Hormonix</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Your personal, high-performance offline music player. Connect a music folder location or import your files to begin listening in studio quality.
          </p>

          {/* Location input directly in Onboarding */}
          <div className="mb-6 bg-zinc-950/60 p-5 rounded-2xl border border-white/5 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Add Music Location Folder</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. D:\Songs"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 text-xs text-zinc-100 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleAddFolder}
                className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all duration-150 active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Save Folder</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleManualFileImport}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-100 border border-white/5 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4 text-purple-400" />
              <span>Import Audio Files</span>
            </button>
            <button
              onClick={() => runBackgroundScan(["D:\\Songs"])}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/10 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4 text-white" />
              <span>Simulate Local Folder Scan</span>
            </button>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6 text-left">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Supported Audio Formats</h4>
            <div className="flex flex-wrap gap-2">
              {['MP3', 'FLAC', 'AAC', 'OGG', 'WAV', 'M4A'].map(fmt => (
                <span key={fmt} className="px-2.5 py-1 rounded-md bg-zinc-950/40 border border-white/5 text-[10px] font-mono text-zinc-400 font-bold">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Loaded Home UI
  return (
    <div className="h-full overflow-y-auto md:p-6 p-4 custom-scrollbar" id="home-view-page">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-tight">{getGreeting()}</h1>
        <p className="text-zinc-400 text-xs md:text-sm mt-1">Welcome back. Ready for some high-fidelity music?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-12">
        {/* Main Content Area: Left/Center 3 columns */}
        <div className="lg:col-span-3 space-y-8">
          {/* Continue Listening section */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-l-2 border-purple-500 pl-2">Continue Listening</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {albums.slice(0, 4).map((album, idx) => (
                <div 
                  key={`${album.artist}-${album.title}-${idx}`}
                  onClick={() => {
                    selectAlbum(album);
                    setView('albums');
                  }}
                  className="group cursor-pointer rounded-2xl border border-white/5 bg-zinc-900/20 p-3 hover:bg-zinc-900/60 hover:border-purple-500/20 active:scale-98 transition-all duration-200"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 mb-3 border border-white/5">
                    <CoverArt songId={album.coverArtSongId} hasCover={!!album.coverArtSongId} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (album.songs.length > 0) {
                          setQueue(album.songs);
                          playSong(album.songs[0]);
                          setCurrentSong(album.songs[0]);
                        }
                      }}
                      className="absolute bottom-2 right-2 flex h-8 w-8 scale-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg opacity-0 group-hover:scale-100 group-hover:opacity-100 hover:bg-purple-500 active:scale-90 transition-all duration-150"
                    >
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </button>
                  </div>
                  <h4 className="truncate text-xs font-bold text-zinc-200">{album.title}</h4>
                  <p className="truncate text-[10px] text-zinc-500 mt-0.5">{album.artist}</p>
                </div>
              ))}
              {albums.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-2xl">
                  No albums found. Run library scan.
                </div>
              )}
            </div>
          </div>

          {/* Recently Added Section */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-l-2 border-pink-500 pl-2">Recently Added</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...songs].sort((a,b) => b.addedAt - a.addedAt).slice(0, 4).map((song, idx) => (
                <div 
                  key={`${song.id}-${idx}`}
                  onClick={() => handlePlaySong(song)}
                  className="group cursor-pointer rounded-2xl border border-white/5 bg-zinc-900/20 p-3 hover:bg-zinc-900/60 hover:border-pink-500/20 active:scale-98 transition-all duration-200"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 mb-3 border border-white/5">
                    <CoverArt songId={song.id} hasCover={song.hasCover} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <button className="absolute bottom-2 right-2 flex h-8 w-8 scale-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg opacity-0 group-hover:scale-100 group-hover:opacity-100 hover:bg-pink-500 active:scale-90 transition-all duration-150">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </button>
                  </div>
                  <h4 className="truncate text-xs font-bold text-zinc-200">{song.title}</h4>
                  <p className="truncate text-[10px] text-zinc-500 mt-0.5">{song.artist}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Most Played tracks */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-l-2 border-purple-500 pl-2">Most Played</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 4).map((song, idx) => (
                <div 
                  key={`${song.id}-${idx}`}
                  onClick={() => handlePlaySong(song)}
                  className="group flex items-center justify-between cursor-pointer rounded-xl border border-white/5 bg-zinc-900/15 p-2 hover:bg-zinc-900/60 hover:border-purple-500/10 active:scale-99 transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CoverArt songId={song.id} hasCover={song.hasCover} className="h-10 w-10 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-zinc-200">{song.title}</h4>
                      <p className="truncate text-[10px] text-zinc-500">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pr-2">
                    <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      {song.playCount || 0} plays
                    </span>
                    <Play className="h-3.5 w-3.5 text-zinc-500 group-hover:text-purple-400 group-hover:scale-110 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Artists */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-l-2 border-purple-500 pl-2">Favorite Artists</h2>
            <div className="flex flex-wrap gap-4">
              {artists.slice(0, 5).map((artist, idx) => (
                <div 
                  key={`${artist.name}-${idx}`}
                  onClick={() => {
                    selectArtist(artist);
                    setView('artists');
                  }}
                  className="flex flex-col items-center cursor-pointer group bg-zinc-900/20 hover:bg-zinc-900/50 border border-white/5 rounded-2xl p-4 w-28 text-center transition-all duration-150 active:scale-95"
                >
                  <div className="h-16 w-16 rounded-full border border-purple-500/10 bg-purple-500/5 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform duration-200 mb-3 shadow-inner">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="truncate text-xs font-bold text-zinc-300 w-full">{artist.name}</h4>
                  <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{artist.songCount} songs</p>
                </div>
              ))}
              {artists.length === 0 && (
                <div className="py-6 text-center text-xs text-zinc-600 w-full">
                  No artist profiles loaded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info Panels: Right 1 column */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Quick Actions</span>
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAddFolderModal(true)}
                className="flex h-10 w-full items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white hover:border-purple-500/20 active:scale-98 transition-all duration-150"
              >
                <Plus className="h-4 w-4 text-purple-400" />
                <span>Add Folder Location</span>
              </button>
              <button
                onClick={() => runBackgroundScan()}
                className="flex h-10 w-full items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white hover:border-purple-500/20 active:scale-98 transition-all duration-150"
              >
                <RefreshCw className="h-4 w-4 text-purple-400" />
                <span>Scan Library</span>
              </button>
              <button
                onClick={() => setShowCreatePlaylistModal(true)}
                className="flex h-10 w-full items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white hover:border-purple-500/20 active:scale-98 transition-all duration-150"
              >
                <Plus className="h-4 w-4 text-purple-400" />
                <span>Create Playlist</span>
              </button>
              <button
                onClick={() => setView('library')}
                className="flex h-10 w-full items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-left text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white hover:border-purple-500/20 active:scale-98 transition-all duration-150"
              >
                <FolderClosed className="h-4 w-4 text-purple-400" />
                <span>Open Folder Browser</span>
              </button>
            </div>
          </div>

          {/* Storage Stats Panel */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-purple-400" />
              <span>Storage Statistics</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Songs</span>
                <span className="text-lg font-black text-zinc-100 mt-1 block">{songs.length}</span>
              </div>
              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Artists</span>
                <span className="text-lg font-black text-zinc-100 mt-1 block">{artists.length}</span>
              </div>
              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Albums</span>
                <span className="text-lg font-black text-zinc-100 mt-1 block">{albums.length}</span>
              </div>
              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 text-center col-span-2">
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Duration</span>
                <span className="text-sm font-black text-purple-400 mt-1 block">
                  {formatDuration(songs.reduce((acc, s) => acc + s.duration, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Music Folder Locations panel */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-3 flex items-center gap-1.5">
              <FolderClosed className="h-4 w-4 text-purple-400" />
              <span>Music Locations</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {libraryLocations && libraryLocations.map((path) => (
                <div key={path} className="flex items-center justify-between bg-zinc-950/60 rounded-xl px-3 py-2 border border-white/5 text-[10px]">
                  <span className="truncate text-zinc-300 font-mono flex-1 mr-2">{path}</span>
                  <button 
                    onClick={() => handleRemoveFolder(path)}
                    className="text-zinc-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(!libraryLocations || libraryLocations.length === 0) && (
                <p className="text-[10px] text-zinc-500 text-center py-4">No music locations defined. Manage folders below.</p>
              )}
            </div>
            <button
              onClick={() => setShowAddFolderModal(true)}
              className="mt-3 h-8 w-full rounded-xl border border-dashed border-white/10 hover:border-purple-500/30 flex items-center justify-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-purple-400 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Folder</span>
            </button>
          </div>

          {/* Recent Activity Panel */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-1.5">
              <HistoryIcon className="h-4 w-4 text-purple-400" />
              <span>Recent Activity</span>
            </h3>
            <div className="space-y-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Last Scanned</span>
                </span>
                <span className="font-mono text-zinc-300 text-[10px] font-bold">
                  {scanStatus.isScanning ? "Scanning..." : "Just now"}
                </span>
              </div>

              <div className="flex flex-col border-t border-white/5 pt-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Play className="h-3 w-3 text-purple-400" />
                  <span>Last Played Track</span>
                </span>
                {history.length > 0 ? (
                  <div className="bg-zinc-950/40 rounded-xl p-2 border border-white/5 flex items-center gap-2">
                    <div className="text-[10px] font-semibold text-zinc-300 truncate flex-1">
                      {songs.find(s => s.id === history[0].songId)?.title || "Unknown Title"}
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-600">No tracks played yet</span>
                )}
              </div>

              <div className="flex flex-col border-t border-white/5 pt-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Music className="h-3 w-3 text-purple-400" />
                  <span>Recently Imported</span>
                </span>
                {songs.length > 0 ? (
                  <div className="bg-zinc-950/40 rounded-xl p-2 border border-white/5 flex items-center gap-2">
                    <div className="text-[10px] font-semibold text-zinc-300 truncate flex-1">
                      {[...songs].sort((a,b)=>b.addedAt-a.addedAt)[0].title}
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-600">No tracks imported</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden manual selector */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Add Folder Modal Popups */}
      <AnimatePresence>
        {showAddFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <h2 className="text-sm font-black text-zinc-100 uppercase tracking-wider mb-2">Save Music Location</h2>
              <p className="text-xs text-zinc-500 mb-4">Enter a local directory folder path. Hormonix will automatically background scan this folder on startup.</p>
              
              <input
                type="text"
                placeholder="e.g. D:\Songs"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs text-zinc-100 focus:border-purple-500 focus:outline-none mb-4 font-mono"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddFolderModal(false)}
                  className="h-10 px-4 rounded-xl hover:bg-white/5 text-xs font-semibold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFolder}
                  className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all active:scale-95"
                >
                  Save Folder Location
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCreatePlaylistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-sm font-black text-zinc-100 uppercase tracking-wider mb-2">Create Playlist</h2>
              <p className="text-xs text-zinc-500 mb-4">Create a custom collection of your favorite tracks.</p>
              
              <input
                type="text"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs text-zinc-100 focus:border-purple-500 focus:outline-none mb-4"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="h-10 px-4 rounded-xl hover:bg-white/5 text-xs font-semibold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all active:scale-95"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
