/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Song } from '../../types';
import { db } from '../../database/db';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { Folder, ChevronRight, ChevronDown, FileAudio, Play, Plus, Search, FolderClosed as FolderMusic } from 'lucide-react';
import { useToastStore } from '../common/Toast';

interface VirtualNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: Record<string, VirtualNode>;
  song?: Song;
}

export const FolderBrowser: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [root, setRoot] = useState<VirtualNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ 'Music': true });
  const [searchQuery, setSearchQuery] = useState('');
  
  const { playSong, setQueue, addToQueue } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const allSongs = await db.getAllSongs();
      setSongs(allSongs);
      buildVirtualTree(allSongs);
    } catch (err) {
      console.error('Failed to build virtual folders:', err);
    }
  };

  const buildVirtualTree = (songList: Song[]) => {
    const rootNode: VirtualNode = {
      name: 'Music',
      type: 'folder',
      path: 'Music',
      children: {}
    };

    songList.forEach((song) => {
      // Create a virtual path using Artist and Album
      // Falls back to "Unknown Artist" and "Unknown Album" if needed
      const artist = song.artist || 'Unknown Artist';
      const album = song.album || 'Unknown Album';
      
      const artistPath = `Music/${artist}`;
      const albumPath = `${artistPath}/${album}`;
      const songPath = `${albumPath}/${song.title}`;

      // 1. Ensure artist folder exists
      if (!rootNode.children![artist]) {
        rootNode.children![artist] = {
          name: artist,
          type: 'folder',
          path: artistPath,
          children: {}
        };
      }

      // 2. Ensure album folder exists
      const artistNode = rootNode.children![artist];
      if (!artistNode.children![album]) {
        artistNode.children![album] = {
          name: album,
          type: 'folder',
          path: albumPath,
          children: {}
        };
      }

      // 3. Add song file
      const albumNode = artistNode.children![album];
      albumNode.children![song.title] = {
        name: `${song.trackNumber ? `${song.trackNumber}. ` : ''}${song.title}`,
        type: 'file',
        path: songPath,
        song: song
      };
    });

    setRoot(rootNode);
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Collect all songs under a folder node recursively
  const collectSongs = (node: VirtualNode): Song[] => {
    if (node.type === 'file' && node.song) {
      return [node.song];
    }
    let list: Song[] = [];
    if (node.children) {
      Object.values(node.children).forEach((child) => {
        list = [...list, ...collectSongs(child)];
      });
    }
    return list;
  };

  const handlePlayFolder = (node: VirtualNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderSongs = collectSongs(node);
    if (folderSongs.length === 0) {
      showToast('No audio tracks inside this folder', 'error');
      return;
    }
    setQueue(folderSongs);
    setCurrentSong(folderSongs[0]);
    audioEngine.loadSong(folderSongs[0]).then(() => play());
    showToast(`Playing folder: ${node.name} (${folderSongs.length} tracks)`, 'success');
  };

  const handleEnqueueFolder = (node: VirtualNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderSongs = collectSongs(node);
    if (folderSongs.length === 0) return;
    
    folderSongs.forEach((s) => addToQueue(s));
    showToast(`Enqueued folder: ${node.name} (${folderSongs.length} tracks)`, 'success');
  };

  const renderNode = (node: VirtualNode, depth = 0) => {
    const isExpanded = !!expandedPaths[node.path];
    const isFolder = node.type === 'folder';

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchInSelf = node.name.toLowerCase().includes(lowerQuery);
      const matchInChildren = isFolder && collectSongs(node).some(
        s => s.title.toLowerCase().includes(lowerQuery) || s.artist.toLowerCase().includes(lowerQuery)
      );
      if (!matchInSelf && !matchInChildren) return null;
    }

    return (
      <div key={node.path} className="flex flex-col select-none">
        {/* Row UI */}
        <div 
          onClick={() => isFolder ? toggleExpand(node.path) : null}
          className={`group flex items-center justify-between rounded-xl py-2 px-3 text-sm cursor-pointer transition-colors ${
            isFolder 
              ? 'hover:bg-white/5 text-zinc-300 hover:text-zinc-100' 
              : 'hover:bg-purple-500/5 border-b border-transparent hover:border-purple-500/10 text-zinc-400 hover:text-zinc-200'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {isFolder ? (
              <div className="flex items-center gap-1 text-zinc-500">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Folder className={`h-4.5 w-4.5 transition-colors ${isExpanded ? 'text-purple-400 fill-purple-400/20' : 'text-zinc-400'}`} />
              </div>
            ) : (
              <FileAudio className="h-4 w-4 text-purple-400/80 ml-5 flex-shrink-0" />
            )}

            <span className="truncate font-medium">{node.name}</span>
          </div>

          {/* Action buttons on hover */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity duration-150 pl-2">
            {isFolder ? (
              <>
                <button
                  onClick={(e) => handlePlayFolder(node, e)}
                  title="Play all tracks in folder"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
                <button
                  onClick={(e) => handleEnqueueFolder(node, e)}
                  title="Enqueue all tracks in folder"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.song) {
                      playSong(node.song);
                      setCurrentSong(node.song);
                      audioEngine.loadSong(node.song).then(() => play());
                    }
                  }}
                  title="Play track"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.song) {
                      addToQueue(node.song);
                      showToast(`Enqueued "${node.song.title}"`, 'success');
                    }
                  }}
                  title="Add to queue"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Children Render */}
        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {Object.keys(node.children)
              .sort((a, b) => {
                // Folders first, then files alphabetically
                const nodeA = node.children![a];
                const nodeB = node.children![b];
                if (nodeA.type !== nodeB.type) {
                  return nodeA.type === 'folder' ? -1 : 1;
                }
                return a.localeCompare(b);
              })
              .map((childKey) => renderNode(node.children![childKey], depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-md h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <FolderMusic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">Folder Browser</h3>
            <p className="text-xs text-zinc-400">Directly browse the simulated physical file directory tree</p>
          </div>
        </div>

        {/* Local Folder search bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search folders or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Directory list area */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {root ? (
          renderNode(root)
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <Folder className="h-8 w-8 text-zinc-600 mb-2" />
            <span className="text-xs">Scanning folder hierarchy...</span>
          </div>
        )}
      </div>
    </div>
  );
};
