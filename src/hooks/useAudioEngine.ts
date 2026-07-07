import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track, Theme, PlaybackState, Folder } from '../types';
import { DefaultTracks } from '../utils/defaultTracks';
import { SynthwaveEngine } from '../utils/synthwave';
import { parseAudioMetadata } from '../utils/id3';
import { processFolderUpload } from '../utils/folderImporter';

const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'f-synth',
    name: 'Synthwave Labs',
    parentId: null,
    trackIds: ['synth-loop']
  },
  {
    id: 'f-classics',
    name: 'SoundHelix Classics',
    parentId: null,
    trackIds: ['retro-grid', 'arcade-shift']
  },
  {
    id: 'f-ambient',
    name: 'Sunset Highway Chill',
    parentId: null,
    trackIds: ['neon-sunset']
  }
];

export function useAudioEngine() {
  const [playlist, setPlaylist] = useState<Track[]>(DefaultTracks);
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('spotifywave_folders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_FOLDERS;
  });

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const currentTrack = playlist[currentTrackIndex] || null;

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    localStorage.setItem('spotifywave_folders', JSON.stringify(folders));
  }, [folders]);

  const createFolder = (name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: 'f-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: name.trim() || 'New Folder',
      parentId,
      trackIds: []
    };
    setFolders(prev => [...prev, newFolder]);
    showNotification(`Folder "${newFolder.name}" created!`, 'success');
    return newFolder.id;
  };

  const renameFolder = (folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() || f.name } : f));
    showNotification('Folder renamed!', 'success');
  };

  const deleteFolder = (folderId: string) => {
    setFolders(prev => {
      const targetFolder = prev.find(f => f.id === folderId);
      if (!targetFolder) return prev;
      const parentId = targetFolder.parentId;
      return prev
        .filter(f => f.id !== folderId)
        .map(f => (f.parentId === folderId ? { ...f, parentId } : f));
    });
    showNotification('Folder deleted!', 'info');
  };

  const moveTrackToFolder = (trackId: string, destFolderId: string | null) => {
    setFolders(prev => {
      return prev.map(f => {
        let updatedTrackIds = f.trackIds.filter(id => id !== trackId);
        if (destFolderId && f.id === destFolderId) {
          if (!updatedTrackIds.includes(trackId)) {
            updatedTrackIds = [...updatedTrackIds, trackId];
          }
        }
        return { ...f, trackIds: updatedTrackIds };
      });
    });
    
    if (destFolderId) {
      const folderName = folders.find(f => f.id === destFolderId)?.name || 'folder';
      showNotification(`Moved to "${folderName}"`, 'success');
    } else {
      showNotification('Moved to Root Library', 'info');
    }
  };

  // React state mirroring playback
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 300,
    volume: 0.8,
    isMuted: false,
    isShuffle: false,
    isRepeat: 'all',
    gaplessEnabled: true,
    crossfadeDuration: 3, // default 3 seconds transition
  });

  // Native refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Dual Player Refs for Gapless/Crossfading
  const playerARef = useRef<HTMLAudioElement | null>(null);
  const playerBRef = useRef<HTMLAudioElement | null>(null);

  // Tracker for which player is active: 'A' or 'B'
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const activePlayerRef = useRef<'A' | 'B'>('A');

  // Trigger state for crossfade active
  const isCrossfadingRef = useRef<boolean>(false);
  
  // Custom synth engine ref
  const synthRef = useRef<SynthwaveEngine | null>(null);

  // Track timer and loop handles
  const timeUpdateInterval = useRef<any>(null);

  // Initialize Audio Environment
  const initAudioCtx = useCallback(() => {
    if (audioCtxRef.current) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;

      analyserRef.current = analyser;
      audioCtxRef.current = ctx;

      // Create audio elements
      const playerA = new Audio();
      const playerB = new Audio();
      playerA.crossOrigin = 'anonymous';
      playerB.crossOrigin = 'anonymous';

      // Connect elements to analyzer
      const sourceA = ctx.createMediaElementSource(playerA);
      const sourceB = ctx.createMediaElementSource(playerB);

      sourceA.connect(analyser);
      sourceB.connect(analyser);
      analyser.connect(ctx.destination);

      playerARef.current = playerA;
      playerBRef.current = playerB;

      // Initialize the procedural synthesizer, route its output to the same analyser
      synthRef.current = new SynthwaveEngine(ctx, analyser);
    } catch (e) {
      console.error("Failed to initialize Web Audio pipeline: ", e);
    }
  }, []);

  // Update Volumes
  const updateVolumes = useCallback(() => {
    const { volume, isMuted } = playbackState;
    const finalVol = isMuted ? 0 : volume;

    if (currentTrack?.format === 'SYNTH') {
      if (synthRef.current) {
        synthRef.current.setVolume(finalVol);
      }
    } else {
      if (!isCrossfadingRef.current) {
        if (playerARef.current) playerARef.current.volume = activePlayerRef.current === 'A' ? finalVol : 0;
        if (playerBRef.current) playerBRef.current.volume = activePlayerRef.current === 'B' ? finalVol : 0;
      }
    }
  }, [playbackState, currentTrack]);

  useEffect(() => {
    updateVolumes();
  }, [playbackState.volume, playbackState.isMuted, updateVolumes]);

  // Main tick tracking seeker pos
  const startTimer = useCallback(() => {
    if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current);

    timeUpdateInterval.current = setInterval(() => {
      // 1. If currently synthesizing, increment simulated time
      if (currentTrack?.format === 'SYNTH') {
        setPlaybackState(prev => {
          if (!prev.isPlaying) return prev;
          let nextTime = prev.currentTime + 0.25;
          if (nextTime >= prev.duration) {
            nextTime = 0; // synthesizer loops
          }
          return { ...prev, currentTime: nextTime };
        });
        return;
      }

      // 2. Fetch active player details
      const activeElement = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
      if (!activeElement) return;

      const curTime = activeElement.currentTime;
      const totalDur = activeElement.duration || 0;

      if (!isNaN(curTime) && curTime > 0) {
        setPlaybackState(prev => ({
          ...prev,
          currentTime: curTime,
          duration: totalDur || prev.duration,
        }));

        // 3. Gapless / Crossfade Trigger Logic:
        // If remaining time is less than crossfade duration, and we of course have a NEXT track
        const remaining = totalDur - curTime;
        const nextIdx = getNextTrackIndex();

        if (
          playbackState.gaplessEnabled &&
          remaining <= playbackState.crossfadeDuration &&
          remaining > 0.1 &&
          nextIdx !== currentTrackIndex &&
          !isCrossfadingRef.current &&
          playbackState.isPlaying
        ) {
          triggerCrossfade(nextIdx);
        } else if (!playbackState.gaplessEnabled && activeElement.ended && !isCrossfadingRef.current) {
          // Normal sequential play
          playNext();
        }
      }
    }, 250);
  }, [currentTrackIndex, playlist, currentTrack]);

  const stopTimer = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  // Compute indices safely
  const getNextTrackIndex = useCallback((): number => {
    if (playlist.length <= 1) return 0;
    if (playbackState.isShuffle) {
      // Pick random
      let rand = Math.floor(Math.random() * playlist.length);
      while (rand === currentTrackIndex && playlist.length > 1) {
        rand = Math.floor(Math.random() * playlist.length);
      }
      return rand;
    }
    return (currentTrackIndex + 1) % playlist.length;
  }, [playlist, currentTrackIndex, playbackState.isShuffle]);

  const getPrevTrackIndex = useCallback((): number => {
    if (playlist.length <= 1) return 0;
    return (currentTrackIndex - 1 + playlist.length) % playlist.length;
  }, [playlist, currentTrackIndex]);

  // CROSSFADE ENGINE
  const triggerCrossfade = async (nextIdx: number) => {
    if (isCrossfadingRef.current) return;
    isCrossfadingRef.current = true;

    initAudioCtx();

    const currentIdx = currentTrackIndex;
    const nextTrack = playlist[nextIdx];

    const outgoingPlayer = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
    const incomingPlayer = activePlayerRef.current === 'A' ? playerBRef.current : playerARef.current;
    const incomingId = activePlayerRef.current === 'A' ? 'B' : 'A';

    console.log(`Crossfading from track ${currentIdx} to ${nextIdx} using players: Outgong = ${activePlayerRef.current}, Incoming = ${incomingId}`);

    if (!outgoingPlayer || !incomingPlayer) {
      isCrossfadingRef.current = false;
      playNext();
      return;
    }

    // Prepare incoming player
    incomingPlayer.src = nextTrack.url;
    incomingPlayer.volume = 0;
    
    // Attempt playback activation
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      await incomingPlayer.play();
    } catch (e) {
      console.warn("Failed to initiate incoming crossfade player audio: ", e);
      // Fallback
      isCrossfadingRef.current = false;
      playTrackIndex(nextIdx);
      return;
    }

    // Set updated indices early
    setCurrentTrackIndex(nextIdx);
    setActivePlayer(incomingId);
    activePlayerRef.current = incomingId;

    // Crossfade Volume Ramp
    const durationMs = playbackState.crossfadeDuration * 1000;
    const steps = 20;
    const stepTime = durationMs / steps;
    let stepCount = 0;
    const targetVol = playbackState.isMuted ? 0 : playbackState.volume;

    const fadeInterval = setInterval(() => {
      stepCount++;
      const outgoingRatio = 1 - (stepCount / steps);
      const incomingRatio = stepCount / steps;

      if (outgoingPlayer) outgoingPlayer.volume = targetVol * outgoingRatio;
      if (incomingPlayer) incomingPlayer.volume = targetVol * incomingRatio;

      if (stepCount >= steps) {
        clearInterval(fadeInterval);
        
        // Finalize
        if (outgoingPlayer) {
          outgoingPlayer.pause();
          outgoingPlayer.currentTime = 0;
        }
        if (incomingPlayer) {
          incomingPlayer.volume = targetVol;
        }
        isCrossfadingRef.current = false;
        console.log("Crossfade complete.");
      }
    }, stepTime);
  };

  // MAIN CONTROLS
  const playTrackIndex = async (index: number) => {
    initAudioCtx();
    setCurrentTrackIndex(index);
    const track = playlist[index];
    if (!track) return;

    stopTimer();

    // Reset crossfading lock if user force swaps
    isCrossfadingRef.current = false;

    // Stop synth if moving away
    if (synthRef.current) {
      synthRef.current.stop();
    }

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      currentTime: 0,
    }));

    if (track.format === 'SYNTH') {
      // Handle synthesizer
      setTimeout(() => {
        if (synthRef.current) {
          synthRef.current.setVolume(playbackState.isMuted ? 0 : playbackState.volume);
          synthRef.current.start();
        }
        startTimer();
      }, 50);
    } else {
      // Handle HTML5 Player
      const player = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
      const otherPlayer = activePlayerRef.current === 'A' ? playerBRef.current : playerARef.current;

      if (player) {
        player.onerror = null;
        player.crossOrigin = 'anonymous';
        player.src = track.url;
        player.volume = playbackState.isMuted ? 0 : playbackState.volume;

        player.onerror = async () => {
          player.onerror = null;
          // Clean up the crossOrigin specification to resolve CORS barriers on the audio level
          player.removeAttribute('crossorigin');
          player.src = track.url;
          player.load();
          
          try {
            showNotification(`Sandbox CORS bypassed: resolving stream layout for "${track.title}"`, 'info');
            await player.play();
          } catch (errInner) {
            console.error("[AudioEngine] Secondary load failure. Switching fallback synthesizer loop.", errInner);
            showNotification(`Stream error. Re-routing output to high-fidelity Offline Synth engine.`, 'warning');
            playTrackIndex(0);
          }
        };

        try {
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          await player.play();
        } catch (e) {
          console.error("Playback play() promise rejected: ", e);
          // Let onerror fallback take control if needed
        }
      }

      // Quiet down redundant player
      if (otherPlayer) {
        otherPlayer.pause();
        otherPlayer.currentTime = 0;
      }

      startTimer();
    }
  };

  const togglePlay = async () => {
    initAudioCtx();
    const shouldPlay = !playbackState.isPlaying;

    if (currentTrack?.format === 'SYNTH') {
      if (synthRef.current) {
        if (shouldPlay) {
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          synthRef.current.start();
          startTimer();
        } else {
          synthRef.current.stop();
          stopTimer();
        }
      }
    } else {
      const player = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
      if (player) {
        if (shouldPlay) {
          try {
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
              await audioCtxRef.current.resume();
            }
            await player.play();
            startTimer();
          } catch (e) {
            console.error(e);
          }
        } else {
          player.pause();
          stopTimer();
        }
      }
    }

    setPlaybackState(prev => ({ ...prev, isPlaying: shouldPlay }));
  };

  const playNext = useCallback(() => {
    const nextIdx = getNextTrackIndex();
    playTrackIndex(nextIdx);
  }, [playlist, currentTrackIndex, playbackState.isShuffle, getNextTrackIndex]);

  const playPrev = useCallback(() => {
    const prevIdx = getPrevTrackIndex();
    playTrackIndex(prevIdx);
  }, [playlist, currentTrackIndex, getPrevTrackIndex]);

  const seek = (time: number) => {
    if (currentTrack?.format === 'SYNTH') {
      // Loop simulator
      setPlaybackState(prev => ({ ...prev, currentTime: time }));
      return;
    }

    const player = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
    if (player) {
      player.currentTime = time;
      setPlaybackState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const setVolume = (vol: number) => {
    setPlaybackState(prev => ({ ...prev, volume: vol, isMuted: vol === 0 }));
  };

  const toggleMute = () => {
    setPlaybackState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleShuffle = () => {
    setPlaybackState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  };

  const toggleRepeat = () => {
    setPlaybackState(prev => {
      const nextRepeat: 'none' | 'all' | 'one' = 
        prev.isRepeat === 'none' ? 'all' : 
        prev.isRepeat === 'all' ? 'one' : 'none';
      
      const playerA = playerARef.current;
      const playerB = playerBRef.current;
      if (playerA) playerA.loop = nextRepeat === 'one';
      if (playerB) playerB.loop = nextRepeat === 'one';

      return { ...prev, isRepeat: nextRepeat };
    });
  };

  const setGaplessEnabled = (enabled: boolean) => {
    setPlaybackState(prev => ({ ...prev, gaplessEnabled: enabled }));
  };

  const setCrossfadeDuration = (duration: number) => {
    setPlaybackState(prev => ({ ...prev, crossfadeDuration: duration }));
  };

  // HANDLE USER OFFLINE FILE UPLOADS
  const handleAddNewTrack = async (file: File) => {
    try {
      const parsed = await parseAudioMetadata(file);
      const blobUrl = URL.createObjectURL(file);

      const newTrackId = 'uploaded-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newTrack: Track = {
        id: newTrackId,
        title: parsed.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: parsed.artist || 'Local Upload',
        album: parsed.album || 'Local Library',
        duration: 210, // will load actual dur on meta-load
        file: file,
        url: blobUrl,
        coverUrl: parsed.coverUrl || undefined, // Extracted APIC
        format: parsed.format,
        sampleRate: parsed.sampleRate,
        bitDepth: parsed.bitDepth,
        size: parsed.size,
      };

      // Extract duration from temporary audio item
      const tempAudio = new Audio(blobUrl);
      tempAudio.addEventListener('loadedmetadata', () => {
        newTrack.duration = tempAudio.duration;
        setPlaylist(prev => {
          // If previous playlist contains duplicate title/artist, avoid adding
          if (prev.some(t => t.title === newTrack.title && t.artist === newTrack.artist)) {
            return prev;
          }
          const updated = [...prev, newTrack];
          return updated;
        });

        // Add to folder based on webkitRelativePath if available
        const relativePath = (file as any).webkitRelativePath || '';
        if (relativePath && relativePath.includes('/')) {
          setFolders(prevFolders => {
            const parts = relativePath.split('/').filter((p: string) => {
              const lower = p.toLowerCase();
              return p && !lower.endsWith('.mp3') && !lower.endsWith('.flac') && !lower.endsWith('.wav') && !lower.endsWith('.m4a');
            });
            if (parts.length === 0) return prevFolders;

            let currentParentId: string | null = null;
            const updated = [...prevFolders];

            for (const folderName of parts) {
              const existing = updated.find(f => f.name === folderName && f.parentId === currentParentId);
              if (existing) {
                currentParentId = existing.id;
              } else {
                const newId = 'f-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
                const newFolder: Folder = {
                  id: newId,
                  name: folderName,
                  parentId: currentParentId,
                  trackIds: []
                };
                updated.push(newFolder);
                currentParentId = newId;
              }
            }

            // Put track in the leaf folder
            if (currentParentId) {
              return updated.map(f => {
                if (f.id === currentParentId) {
                  return { ...f, trackIds: [...f.trackIds, newTrackId] };
                }
                return f;
              });
            }
            return updated;
          });
          showNotification(`Imported folder hierarchy for "${newTrack.title}"`, 'success');
        }
      });
    } catch (e) {
      console.error("Failed to upload local audio track", e);
    }
  };

  const handleImportFolderBatch = async (files: File[]) => {
    try {
      const result = await processFolderUpload(files, folders);
      if (result.tracks.length === 0) {
        showNotification(result.summary, 'warning');
        return;
      }

      setPlaylist(prev => {
        const updated = [...prev];
        result.tracks.forEach(newTrack => {
          if (!updated.some(t => t.title === newTrack.title && t.artist === newTrack.artist)) {
            updated.push(newTrack);
          }
        });
        return updated;
      });

      setFolders(result.folders);
      showNotification(result.summary, 'success');

      // Asynchronously load actual metadata and duration from the audio elements once they load in memory
      result.tracks.forEach(newTrack => {
        const tempAudio = new Audio(newTrack.url);
        tempAudio.addEventListener('loadedmetadata', () => {
          setPlaylist(prev =>
            prev.map(t => (t.id === newTrack.id ? { ...t, duration: tempAudio.duration } : t))
          );
        });
      });
    } catch (e) {
      console.error("Batch folder import failed", e);
      showNotification("Failed to import the directory path. Make sure files are readable.", "error");
    }
  };

  // Quick remove track
  const removeTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.length <= 1) return; // Keep at least one
    
    // Revoke blob URL to avoid memory leak if uploaded file
    const removedTrack = playlist.find(t => t.id === id);
    if (removedTrack?.url.startsWith('blob:')) {
      URL.revokeObjectURL(removedTrack.url);
    }
    if (removedTrack?.coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(removedTrack.coverUrl);
    }

    const itemIdx = playlist.findIndex(t => t.id === id);
    setPlaylist(prev => {
      const filtered = prev.filter(t => t.id !== id);
      return filtered;
    });

    // Also remove from any folders
    setFolders(prev => prev.map(f => ({ ...f, trackIds: f.trackIds.filter(tid => tid !== id) })));

    if (itemIdx === currentTrackIndex) {
      // Auto play next or 0
      const nextIdx = currentTrackIndex >= playlist.length - 1 ? 0 : currentTrackIndex;
      setTimeout(() => playTrackIndex(nextIdx), 100);
    } else if (itemIdx < currentTrackIndex) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (playerARef.current) {
        playerARef.current.pause();
        playerARef.current.src = '';
      }
      if (playerBRef.current) {
        playerBRef.current.pause();
        playerBRef.current.src = '';
      }
      if (synthRef.current) {
        synthRef.current.stop();
      }
    };
  }, [stopTimer]);

  return {
    playlist,
    currentTrackIndex,
    currentTrack,
    playbackState,
    activePlayer,
    analyser: analyserRef.current,
    playTrackIndex,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setGaplessEnabled,
    setCrossfadeDuration,
    handleAddNewTrack,
    handleImportFolderBatch,
    removeTrack,
    initAudioPipeline: initAudioCtx,
    notification,
    clearNotification,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveTrackToFolder
  };
}
