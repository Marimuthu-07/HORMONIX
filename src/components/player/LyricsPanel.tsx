/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { audioEngine } from '../../audio/AudioEngine';
import { Music, Smile, Volume2 } from 'lucide-react';

interface LyricLine {
  time: number; // in seconds
  text: string;
}

const FALLBACK_LYRICS_DB: Record<string, string> = {
  default: `
[00:01.00] (Instrumental Intro)
[00:08.00] Walking down the crowded streets tonight
[00:12.50] Feeling the vibrations of the neon light
[00:17.00] Underneath the shadows of the studio wall
[00:21.00] Listening closely to the dynamic call
[00:25.00] This is the rhythm of our offline flow
[00:29.50] High fidelity channels starting to glow
[00:34.00] Mastered compression taking control
[00:38.20] Deep subharmonic waves in your soul
[00:43.00] Let the matrix play
[00:47.00] Through the night and day
[00:51.50] Seamless crossfade transitions lead the way
[00:57.00] (Equalizer Solo - Low Frequencies Rising)
[01:05.00] Walking down the crowded streets tonight
[01:09.00] Feeling the vibrations of the neon light
[01:14.00] Underneath the shadows of the studio wall
[01:18.00] Listening closely to the dynamic call
[01:23.00] (Outro - Waves Fading Softly)
  `
};

export const LyricsPanel: React.FC = () => {
  const { currentSong } = usePlayerStore();
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll current audio engine time with high frequency for low-latency line highlighting
  useEffect(() => {
    let active = true;
    const updateTime = () => {
      if (!active) return;
      setCurrentTime(audioEngine.getCurrentTime());
      requestAnimationFrame(updateTime);
    };
    requestAnimationFrame(updateTime);
    return () => {
      active = false;
    };
  }, [currentSong]);

  // Parse LRC format
  const parsedLyrics = useMemo<LyricLine[]>(() => {
    // Look up embedded lyrics, or fall back to generate song-specific beautiful lyrics
    let lrcString = currentSong?.lyrics || FALLBACK_LYRICS_DB.default;

    if (!currentSong?.lyrics) {
      // Personalize fallback lyrics with song and artist name
      lrcString = `
[00:01.00] (Instrumental Intro)
[00:06.00] Listening to: "${currentSong?.title || 'Unknown Track'}"
[00:11.00] Performed by: ${currentSong?.artist || 'Unknown Artist'}
[00:15.50] Walking down the crowded streets tonight
[00:20.00] Feeling the vibrations of the neon light
[00:24.50] Underneath the shadows of the studio wall
[00:29.00] Listening closely to the dynamic call
[00:34.00] This is the rhythm of our offline flow
[00:38.50] High fidelity channels starting to glow
[00:43.00] Mastered compression taking control
[00:47.20] Deep subharmonic waves in your soul
[00:51.00] (Bass Boost Active - Feel the Beat)
[00:58.00] Let the matrix play
[01:02.00] Through the night and day
[01:06.50] Seamless crossfade transitions lead the way
[01:12.00] (Equalizer Solo - Low Frequencies Rising)
[01:20.00] Restoring depth to every single bar
[01:25.00] High-performance playback where you are
[01:31.00] (Outro - Waves Fading Softly)
      `;
    }

    const lines: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2})\](.*)/;

    lrcString.split('\n').forEach((line) => {
      const match = regex.exec(line.trim());
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = parseInt(match[3], 10);
        const text = match[4].trim();
        
        const time = mins * 60 + secs + ms / 100;
        lines.push({ time, text });
      }
    });

    return lines.sort((a, b) => a.time - b.time);
  }, [currentSong]);

  // Determine current active lyric line index
  const activeIndex = useMemo(() => {
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLyrics, currentTime]);

  // Auto scroll active lyric line into view with soft physics centering
  useEffect(() => {
    if (activeIndex !== -1 && containerRef.current) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        containerRef.current.scrollTo({
          top: activeElement.offsetTop - containerRef.current.clientHeight / 2 + activeElement.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeIndex]);

  const handleLineClick = (time: number) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
        <Music className="h-10 w-10 mb-2 opacity-50" />
        <span className="text-xs">No track playing.</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative rounded-2xl border border-white/5 bg-zinc-950/40 p-6 select-none">
      {/* Background ambient glow matching current artwork */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />

      {/* Title */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3 relative z-10">
        <Smile className="h-4.5 w-4.5 text-purple-400" />
        <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">Lyrics Teleprompter</span>
        <div className="flex-1" />
        <span className="text-[10px] font-mono font-semibold text-zinc-500">SYNCED MODE</span>
      </div>

      {/* Scroller container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-6 scroll-smooth pr-1 custom-scrollbar relative z-10"
      >
        {parsedLyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;

          return (
            <div
              key={index}
              onClick={() => handleLineClick(line.time)}
              className={`text-center py-2 px-4 cursor-pointer rounded-xl transition-all duration-300 origin-center text-sm md:text-base font-bold ${
                isActive 
                  ? 'text-white scale-105 shadow-[0_4px_20px_rgba(168,85,247,0.15)] bg-purple-500/10 text-shadow-glow' 
                  : isPassed 
                    ? 'text-zinc-500 scale-95 opacity-55 hover:text-zinc-300' 
                    : 'text-zinc-400 scale-98 hover:text-zinc-200 hover:scale-100'
              }`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
