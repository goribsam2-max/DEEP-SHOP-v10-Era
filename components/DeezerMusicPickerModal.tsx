import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Music,
  Play,
  Pause,
  X,
  Check,
  Volume2,
  Film,
} from "lucide-react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { toPlayableAudioUrl } from "../lib/videoEmbed";
import { createResilientAudioPlayer, ResilientAudioPlayer } from "../lib/audioPlayback";

export interface DeezerTrack {
  id: number | string;
  title: string;
  preview: string;
  isFromVideo?: boolean;
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
  coverUrl?: string;
}

interface DeezerMusicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack?: (track: AttachedMusic) => void;
  onSelectMusic?: (track: AttachedMusic) => void;
  selectedTrack?: AttachedMusic | null;
}

const BUILTIN_FALLBACK_TRACKS: DeezerTrack[] = [
  {
    id: "preset_lofi_chill",
    title: "LoFi Chill Study",
    preview:
      "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
    isFromVideo: false,
    artist: { name: "Studio Library" },
    album: { title: "Featured Audio", cover_medium: "" },
  },
  {
    id: "preset_pop_vibe",
    title: "Summer Tropical Vibe",
    preview:
      "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3",
    isFromVideo: false,
    artist: { name: "Studio Library" },
    album: { title: "Featured Audio", cover_medium: "" },
  },
  {
    id: "preset_future_beats",
    title: "Electronic Future Beats",
    preview:
      "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3",
    isFromVideo: false,
    artist: { name: "Studio Library" },
    album: { title: "Featured Audio", cover_medium: "" },
  },
  {
    id: "preset_modern_vlog",
    title: "Modern Creator Vlog",
    preview:
      "https://cdn.pixabay.com/download/audio/2021/11/24/audio_a1622f98f6.mp3?filename=modern-vlog-140795.mp3",
    isFromVideo: false,
    artist: { name: "Studio Library" },
    album: { title: "Featured Audio", cover_medium: "" },
  },
];

const isDirectPlayableMediaUrl = (rawUrl: string): boolean => {
  if (!rawUrl) return false;
  return !/youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com/i.test(
    rawUrl
  );
};

export const DeezerMusicPickerModal: React.FC<DeezerMusicPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
  onSelectMusic,
  selectedTrack,
}) => {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "video_audio" | "featured"
  >("all");
  const [bgDocs, setBgDocs] = useState<DeezerTrack[]>([]);
  const [storyDocs, setStoryDocs] = useState<DeezerTrack[]>([]);
  const [communityVideoTracks, setCommunityVideoTracks] = useState<
    DeezerTrack[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState<number | string | null>(
    null
  );
  const playerRef = useRef<ResilientAudioPlayer | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubBg = onSnapshot(
      query(collection(db, "background_music"), limit(120)),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            const rawUrl = String(
              data.audioUrl || data.url || data.mp3Url || ""
            ).trim();
            const fromVideo = Boolean(data.isFromVideo);
            return {
              id: `bg_${d.id}`,
              title: data.title || data.name || "Original Audio",
              preview: rawUrl,
              isFromVideo: fromVideo,
              artist: {
                name: data.artist || data.addedBy || "Creator Audio",
                picture_medium: data.coverUrl || data.cover || "",
              },
              album: {
                title: fromVideo ? "Video Audio" : "Platform Library",
                cover_medium: data.coverUrl || data.cover || "",
              },
            };
          })
          .filter(
            (t) => Boolean(t.preview) && isDirectPlayableMediaUrl(t.preview)
          );
        setBgDocs(list);
      },
      () => {}
    );

    const unsubStory = onSnapshot(
      query(collection(db, "story_songs"), limit(120)),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            const rawUrl = String(
              data.audioUrl || data.url || data.mp3Url || ""
            ).trim();
            const fromVideo = Boolean(data.isFromVideo);
            return {
              id: `story_${d.id}`,
              title: data.title || data.name || "Story Sound",
              preview: rawUrl,
              isFromVideo: fromVideo,
              artist: {
                name: data.artist || data.addedBy || "Creator Audio",
                picture_medium: data.coverUrl || data.cover || "",
              },
              album: {
                title: fromVideo ? "Video Audio" : "Story Library",
                cover_medium: data.coverUrl || data.cover || "",
              },
            };
          })
          .filter(
            (t) => Boolean(t.preview) && isDirectPlayableMediaUrl(t.preview)
          );
        setStoryDocs(list);
      },
      () => {}
    );

    const unsubVideos = onSnapshot(
      query(collection(db, "scam_posts"), limit(80)),
      (snap) => {
        const extracted: DeezerTrack[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          const audioSource = String(
            data.music?.audioUrl || data.music?.url || data.videoUrl || ""
          ).trim();
          if (!audioSource || !isDirectPlayableMediaUrl(audioSource)) return;

          const authorName = String(
            data.music?.artist || data.authorName || "Creator"
          ).trim();
          const captionTitle = String(
            data.music?.title ||
              (data.title || data.description || "").trim().slice(0, 34) ||
              `${authorName}'s Original Audio`
          );
          const coverImg = String(
            data.music?.cover ||
              data.music?.coverUrl ||
              data.thumbnailUrl ||
              data.authorPhoto ||
              ""
          );
          extracted.push({
            id: `post_audio_${d.id}`,
            title: captionTitle,
            preview: audioSource,
            isFromVideo: true,
            artist: {
              name: authorName,
              picture_medium: coverImg,
            },
            album: {
              title: "Video Audio",
              cover_medium: coverImg,
            },
          });
        });
        setCommunityVideoTracks(extracted);
      },
      () => {}
    );

    return () => {
      unsubBg();
      unsubStory();
      unsubVideos();
    };
  }, [isOpen]);

  const allTracks = useMemo(() => {
    const seenUrls = new Set<string>();
    const combined: DeezerTrack[] = [];

    const pushUnique = (list: DeezerTrack[]) => {
      for (const item of list) {
        const normalizedUrl = item.preview.trim();
        if (!normalizedUrl || seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);
        combined.push(item);
      }
    };

    pushUnique(bgDocs);
    pushUnique(storyDocs);
    pushUnique(communityVideoTracks);
    pushUnique(BUILTIN_FALLBACK_TRACKS);

    return combined;
  }, [bgDocs, storyDocs, communityVideoTracks]);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTracks.filter((track) => {
      if (activeFilter === "video_audio" && !track.isFromVideo) return false;
      if (activeFilter === "featured" && track.isFromVideo) return false;
      if (!q) return true;
      return (
        track.title.toLowerCase().includes(q) ||
        track.artist.name.toLowerCase().includes(q)
      );
    });
  }, [allTracks, activeFilter, searchQuery]);

  const stopAudioPreview = () => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
    setPlayingTrackId(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopAudioPreview();
    }
    return () => {
      stopAudioPreview();
      playerRef.current = null;
    };
  }, [isOpen]);

  const togglePlayPreview = (track: DeezerTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingTrackId === track.id) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();
    if (!track.preview?.trim()) return;

    if (!playerRef.current) {
      playerRef.current = createResilientAudioPlayer({
        volume: 0.85,
      });
    }
    playerRef.current.updateCallbacks({
      onPlay: () => setPlayingTrackId(track.id),
      onPause: () => setPlayingTrackId((curr) => (curr === track.id ? null : curr)),
      onEnded: () => setPlayingTrackId(null),
      onError: () => setPlayingTrackId(null),
    });

    setPlayingTrackId(track.id);
    playerRef.current.play(track.preview, {
      preferVideoElement: Boolean(track.isFromVideo),
    });
  };

  const handleChooseTrack = (track: DeezerTrack) => {
    stopAudioPreview();
    const coverImg =
      track.album.cover_medium || track.artist.picture_medium || "";
    const payload: AttachedMusic = {
      audioUrl: track.preview,
      title: track.title,
      artist: track.artist.name,
      cover: coverImg,
      coverUrl: coverImg,
    };
    onSelectTrack?.(payload);
    onSelectMusic?.(payload);
    onClose();
  };

  const handleRemoveSelected = () => {
    stopAudioPreview();
    const emptyPayload: AttachedMusic = {
      audioUrl: "",
      title: "",
      artist: "",
      cover: "",
      coverUrl: "",
    };
    onSelectTrack?.(emptyPayload);
    onSelectMusic?.(emptyPayload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[86vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden text-zinc-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Select Sound
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Community video audio & studio tracks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors"
            aria-label="Close music picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Tabs */}
        <div className="px-5 pt-3.5 pb-3 space-y-3 border-b border-zinc-100 dark:border-zinc-900">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs or creator audio..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#1877F2]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-zinc-100/90 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`min-h-[38px] px-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              All ({allTracks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("video_audio")}
              className={`min-h-[38px] px-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "video_audio"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Video Audio
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("featured")}
              className={`min-h-[38px] px-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "featured"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Featured
            </button>
          </div>

          {selectedTrack?.audioUrl && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <Volume2 className="w-4 h-4 text-[#1877F2] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {selectedTrack.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {selectedTrack.artist}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSelected}
                className="text-xs font-semibold text-red-500 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 divide-y divide-zinc-100 dark:divide-zinc-900/80">
          {filteredTracks.length === 0 ? (
            <div className="py-14 text-center px-4">
              <Music className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No matching sounds found
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Upload a video or reel to share its original audio with everyone.
              </p>
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isPlaying = playingTrackId === track.id;
              const isSelected = selectedTrack?.audioUrl === track.preview;
              const cover =
                track.album.cover_medium || track.artist.picture_medium || "";

              return (
                <div
                  key={track.id}
                  onClick={() => handleChooseTrack(track)}
                  className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#1877F2]/10"
                      : "hover:bg-zinc-100/80 dark:hover:bg-zinc-900/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => togglePlayPreview(track, e)}
                    className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center group"
                    aria-label={isPlaying ? "Pause preview" : "Play preview"}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : track.isFromVideo ? (
                      <Film className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    ) : (
                      <Music className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        isPlaying
                          ? "bg-black/55 opacity-100"
                          : "bg-black/40 opacity-85 group-hover:opacity-100"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 text-white fill-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      )}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {track.artist.name}
                      {track.isFromVideo ? " · Original Video Audio" : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseTrack(track);
                    }}
                    className={`min-h-[36px] px-4 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-[#0071E3] text-white shadow-xs"
                        : "loops-apple-pill-btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <span>Use</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DeezerMusicPickerModal;
