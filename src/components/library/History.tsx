/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { History, Trash } from 'lucide-react';
import { Song } from '../../types';
import { db } from '../../database/db';
import { SongList } from './SongList';
import { useToastStore } from '../common/Toast';

export const HistoryView: React.FC = () => {
  const [historySongs, setHistorySongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToastStore();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const historyEntries = await db.getPlaybackHistory(100);
      const allSongs = await db.getAllSongs();
      const songsMap = new Map<string, Song>();
      allSongs.forEach((s) => songsMap.set(s.id, s));

      // Map chronological entries back to real song objects
      const matchedSongs = historyEntries
        .map((entry) => songsMap.get(entry.songId))
        .filter((s): s is Song => !!s);

      setHistorySongs(matchedSongs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6" id="history-view-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Chronological logs</h2>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <History className="h-6 w-6 text-purple-400" />
            <span>Recently Played</span>
          </h1>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 font-mono">Retrieving session timeline logs...</p>
      ) : historySongs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
          <History className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">You haven't played any audio tracks yet.</p>
        </div>
      ) : (
        <div className="pb-12">
          <SongList songs={historySongs} onSongDeleted={loadHistory} />
        </div>
      )}
    </div>
  );
};
