/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { db } from '../../database/db';

interface CoverArtProps {
  songId: string | undefined;
  hasCover?: boolean;
  className?: string;
}

export const CoverArt: React.FC<CoverArtProps> = ({ songId, hasCover, className = "w-12 h-12" }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!songId || !hasCover) {
      setImageUrl(null);
      return;
    }

    let isMounted = true;
    let url: string | null = null;

    const loadArt = async () => {
      setLoading(true);
      try {
        const blob = await db.getSongCoverArt(songId);
        if (blob && isMounted) {
          url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch (err) {
        console.warn('Error fetching cover art blob:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadArt();

    return () => {
      isMounted = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [songId, hasCover]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Cover Art"
        className={`${className} object-cover rounded-lg shadow-md`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-lg bg-zinc-800/80 border border-white/5 text-zinc-400 shadow-sm`}>
      <Music className="w-5 h-5 opacity-40 animate-pulse" />
    </div>
  );
};
