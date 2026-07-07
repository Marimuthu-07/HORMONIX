import { Track, Folder } from '../types';
import { parseAudioMetadata } from './id3';

export interface BatchImportResult {
  tracks: Track[];
  folders: Folder[];
  summary: string;
}

/**
 * Client-side directory tree processor.
 * Automatically mirrors the local filesystem directories into the application folders,
 * preserving nested relative pathways and mapping imported audio tracks to their correct leaf directories.
 */
export async function processFolderUpload(
  files: File[],
  existingFolders: Folder[]
): Promise<BatchImportResult> {
  const audioFiles = files.filter(file => {
    const name = file.name.toLowerCase();
    return (
      file.type.startsWith('audio/') ||
      name.endsWith('.mp3') ||
      name.endsWith('.flac') ||
      name.endsWith('.wav') ||
      name.endsWith('.m4a') ||
      name.endsWith('.ogg') ||
      name.endsWith('.aac')
    );
  });

  if (audioFiles.length === 0) {
    return {
      tracks: [],
      folders: existingFolders,
      summary: "No valid audio files found in directory selection."
    };
  }

  const tracks: Track[] = [];
  const updatedFolders = [...existingFolders];

  // Cache lookups: "parentId/folderName" => folderId
  const folderCache = new Map<string, string>();
  existingFolders.forEach(f => {
    const key = `${f.parentId || 'root'}/${f.name}`;
    folderCache.set(key, f.id);
  });

  // Unique tracker to avoid adding duplicate filenames inside a folder structure
  const trackIdentifierSet = new Set<string>();

  for (const file of audioFiles) {
    let parsed;
    try {
      parsed = await parseAudioMetadata(file);
    } catch (err) {
      console.warn("Could not read ID3 metadata for file:", file.name, err);
      parsed = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local Upload',
        album: 'Local Folder',
        format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO'
      };
    }

    const blobUrl = URL.createObjectURL(file);
    const newTrackId = 'uploaded-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    const title = parsed.title || file.name.replace(/\.[^/.]+$/, "");
    const artist = parsed.artist || 'Local Upload';

    // Unique track key
    const trackKey = `${artist}-${title}-${file.size}`;
    if (trackIdentifierSet.has(trackKey)) {
      continue;
    }
    trackIdentifierSet.add(trackKey);

    const newTrack: Track = {
      id: newTrackId,
      title,
      artist,
      album: parsed.album || 'Local Library',
      duration: 180, // Default fallback. Will be dynamicized on play/decode
      file: file,
      url: blobUrl,
      coverUrl: parsed.coverUrl || undefined,
      format: parsed.format || 'MP3',
      sampleRate: parsed.sampleRate || '44.1 kHz',
      bitDepth: parsed.bitDepth || '16-bit',
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
    };

    tracks.push(newTrack);

    // Reconstruct folders from relative pathways
    const relativePath = (file as any).webkitRelativePath || '';
    if (relativePath && relativePath.includes('/')) {
      const parts = relativePath.split('/').filter((p: string) => {
        const lower = p.toLowerCase();
        return p && !lower.endsWith('.mp3') && !lower.endsWith('.flac') && !lower.endsWith('.wav') && !lower.endsWith('.m4a') && !lower.endsWith('.ogg') && !lower.endsWith('.aac');
      });

      if (parts.length > 0) {
        let currentParentId: string | null = null;

        for (const folderName of parts) {
          const cacheKey = `${currentParentId || 'root'}/${folderName}`;
          let folderId = folderCache.get(cacheKey);

          if (!folderId) {
            folderId = 'f-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
            const newFolder: Folder = {
              id: folderId,
              name: folderName,
              parentId: currentParentId,
              trackIds: []
            };
            updatedFolders.push(newFolder);
            folderCache.set(cacheKey, folderId);
          }

          currentParentId = folderId;
        }

        // Assign trackId to the leaf node
        if (currentParentId) {
          const leafFolderIdx = updatedFolders.findIndex(f => f.id === currentParentId);
          if (leafFolderIdx !== -1) {
            const leafFolder = updatedFolders[leafFolderIdx];
            if (!leafFolder.trackIds.includes(newTrackId)) {
              updatedFolders[leafFolderIdx] = {
                ...leafFolder,
                trackIds: [...leafFolder.trackIds, newTrackId]
              };
            }
          }
        }
      }
    }
  }

  const createdFoldersCount = updatedFolders.length - existingFolders.length;
  const summary = `Successfully imported ${tracks.length} songs. Recreated ${createdFoldersCount} folder layers in Spotifywave database.`;

  return {
    tracks,
    folders: updatedFolders,
    summary
  };
}
