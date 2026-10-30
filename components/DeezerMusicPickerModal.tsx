import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Play, Pause, X, Check, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface DeezerTrack {
  id: number | string;
  title: string;
  preview: string;
  artist: {
    name: string;
    picture_medium?: string;
  };
  album: {
    title: string;
    cover_medium: string;
  };
}

export interface AttachedMusic {
  audioUrl: string;
  title: string;
  artist: string;
  cover: string;
}

interface DeezerMusicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: AttachedMusic) => void;
  selectedTrack?: AttachedMusic | null;
}

const GENRE_CHIPS = [
  'Lofi', 'Hindi', 'Brazilian Phonk', 'Cyberpunk', 'Acoustic', 'Pop', 'Hip Hop', 'Chillhop', 'Synthwave'
];

export const DeezerMusicPickerModal: React.FC<DeezerMusicPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  selectedTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'online'>('admin');
  const [adminSongs, setAdminSongs] = useState<DeezerTrack[]>([]);
  const [query, setQuery] = useState('Lofi');
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Currently playing audio preview in modal
  const [playingTrackId, setPlayingTrackId] = useState<number | string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load Admin Uploaded Background Music from Firestore
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "background_music"), (snap) => {
      const docs = snap.docs.map((d, i) => {
        const data = d.data();
        return {
          id: `admin_bg_${d.id}`,
          title: data.title || "Background Track",
          preview: data.audioUrl || data.url || "",
          artist: { name: data.artist || "Admin Featured", picture_medium: data.coverUrl || "" },
          album: { title: "Platform Library", cover_medium: data.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80" },
        };
      }).filter(t => t.preview);
      setAdminSongs(prev => {
        const combined = [...docs];
        return combined;
      });
    });

    const unsub2 = onSnapshot(collection(db, "story_songs"), (snap) => {
      const docs = snap.docs.map((d, i) => {
        const data = d.data();
        return {
          id: `admin_story_${d.id}`,
          title: data.title || "Story Music",
          preview: data.audioUrl || data.url || "",
          artist: { name: data.artist || "Admin Music", picture_medium: data.coverUrl || "" },
          album: { title: "Featured Audio", cover_medium: data.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80" },
        };
      }).filter(t => t.preview);
      setAdminSongs(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = docs.filter(d => !existingIds.has(d.id));
        return [...prev, ...filtered];
      });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      searchMusic(query || 'Lofi');
    } else {
      stopAudio();
    }
  }, [isOpen]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingTrackId(null);
  };

  const searchMusic = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);

    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    try {
      // Try primary CORS Proxy
      let response = await fetch(`https://corsproxy.io/?${encodeURIComponent(deezerUrl)}`);
      
      if (!response.ok) {
        // Fallback CORS proxy
        response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(deezerUrl)}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        setResults(data.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Deezer API error:', err);
      // Secondary fallback with direct search query or sample tracks
      try {
        const fallbackRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(deezerUrl)}`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData && Array.isArray(fallbackData.data)) {
          setResults(fallbackData.data);
        } else {
          setError('Could not fetch music results. Please try another query.');
        }
      } catch (fErr) {
        setError('Failed to connect to music library. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePreviewPlay = (track: DeezerTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (playingTrackId === track.id) {
      stopAudio();
    } else {
      stopAudio();
      const audio = new Audio(track.preview);
      audio.play().catch(err => console.warn('Playback interrupted:', err));
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const handleSelect = (track: DeezerTrack) => {
    stopAudio();
    onSelectTrack({
      audioUrl: track.preview,
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Add Background Music
              </h3>
              <p className="text-xs text-slate-400">Attach audio track to your post or story</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Admin Featured Songs vs Online Search */}
        <div className="px-4 pt-3 pb-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80 w-full">
            <button
              type="button"
              onClick={() => {
                stopAudio();
                setActiveTab('admin');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Admin Featured ({adminSongs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopAudio();
                setActiveTab('online');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'online'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Online Search</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Genre Chips (Shown when Online Search tab active) */}
        {activeTab === 'online' && (
          <div className="p-4 bg-slate-950/60 border-b border-slate-800/60 space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchMusic(query);
              }}
              className="relative flex items-center"
            >
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, genres..."
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-sm pl-10 pr-24 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Search
              </button>
            </form>

            {/* Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {GENRE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setQuery(chip);
                    searchMusic(chip);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    query.toLowerCase() === chip.toLowerCase()
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'admin' ? (
            adminSongs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Music className="w-10 h-10 mx-auto opacity-30 text-indigo-400" />
                <p className="text-sm font-medium">No Admin tracks added yet.</p>
                <p className="text-xs text-slate-500">Switch to Online Search or ask Admin to upload MP3s via Admin Panel.</p>
              </div>
            ) : (
              adminSongs.map((track) => {
                const isSelected = selectedTrack?.audioUrl === track.preview;
                const isPlaying = playingTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelect(track)}
                    className={`group relative flex items-center gap-3.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 group">
                      <img
                        src={track.album.cover_medium}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={(e) => togglePreviewPlay(track, e)}
                        aria-label={isPlaying ? "Pause preview" : "Play preview"}
                        className={`absolute inset-0 flex items-center justify-center transition-all ${
                          isPlaying
                            ? 'bg-black/60 opacity-100'
                            : 'bg-black/40 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {track.artist.name} • <span className="text-slate-500">Admin Featured</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          High Quality Audio
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 pr-1">
                      {isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(track);
                          }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium text-xs rounded-xl transition-colors"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-medium">Searching Deezer Music Catalogue...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-rose-400 mb-3">{error}</p>
              <button
                onClick={() => searchMusic(query || 'Lofi')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl text-slate-200"
              >
                Retry Search
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Music className="w-10 h-10 mx-auto opacity-30 text-indigo-400" />
              <p className="text-sm font-medium">No tracks found for "{query}"</p>
              <p className="text-xs text-slate-500">Try searching for artists like "Arijit Singh", "Drake", or genres like "Lofi".</p>
            </div>
          ) : (
            results.map((track) => {
              const isSelected = selectedTrack?.audioUrl === track.preview;
              const isPlaying = playingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelect(track)}
                  className={`group relative flex items-center gap-3.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Cover Art with Play Button Overlay */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 group">
                    <img
                      src={track.album.cover_medium}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Play preview toggle button */}
                    <button
                      type="button"
                      onClick={(e) => togglePreviewPlay(track, e)}
                      aria-label={isPlaying ? "Pause preview" : "Play preview"}
                      className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-black/60 opacity-100'
                          : 'bg-black/40 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                      </div>
                    </button>
                    {isPlaying && (
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>

                  {/* Track Meta */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {track.artist.name} • <span className="text-slate-500">{track.album.title}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        30s Preview
                      </span>
                      {isPlaying && (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
                          <Volume2 className="w-3 h-3" /> Playing Preview...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select button / indicator */}
                  <div className="flex-shrink-0 pr-1">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(track);
                        }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium text-xs rounded-xl transition-colors"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Track Footer preview if present */}
        {selectedTrack && (
          <div className="p-3 bg-indigo-950/40 border-t border-indigo-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={selectedTrack.cover} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <div className="min-w-0 text-xs">
                <span className="text-slate-400">Selected: </span>
                <span className="font-semibold text-white truncate">{selectedTrack.title}</span>
                <span className="text-slate-400"> - {selectedTrack.artist}</span>
              </div>
            </div>
            <button
              onClick={() => {
                stopAudio();
                onSelectTrack({ audioUrl: '', title: '', artist: '', cover: '' });
              }}
              className="text-xs text-rose-400 hover:underline px-2 py-1"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeezerMusicPickerModal;
