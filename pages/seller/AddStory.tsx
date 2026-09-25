import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import {
  Plus,
  Trash2,
  Music,
  Loader2,
  Play,
  Pause,
  X,
  Search,
  Check,
  RotateCcw,
  Volume2,
  Sliders
} from "lucide-react";

const PRESET_SONGS = [
  {
    id: "preset-1",
    title: "Golden Brown x Love Story",
    artist: "Elliot Sutton",
    plays: "658K",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
  },
  {
    id: "preset-2",
    title: "Dramamine",
    artist: "Flawed Mangoes",
    plays: "891K",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/10/24/audio_34b4ce6dcb.mp3?filename=uplifting-upbeat-corporate-125086.mp3",
  },
  {
    id: "preset-3",
    title: "X-COOL! (Slowed and Reverb)",
    artist: "tienanh109, HDN, MC K3",
    plays: "148K",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_249ea36566.mp3?filename=cyberpunk-2099-10701.mp3",
  },
  {
    id: "preset-4",
    title: "Let Him Cook",
    artist: "XNIMXS",
    plays: "641K",
    coverUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3",
  },
  {
    id: "preset-5",
    title: "BAILA LENTO",
    artist: "sma$her, MC DA$ILVA",
    plays: "42K",
    coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3",
  },
  {
    id: "preset-6",
    title: "ACIDO III (Over Slowed)",
    artist: "UdieNnx, Mc Denny",
    plays: "863K",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a831e5.mp3?filename=chill-abstract-intention-12099.mp3",
  },
  {
    id: "preset-7",
    title: "Skins (Ultra Slowed + Reverb)",
    artist: "KREZUS, Surreal_dvd",
    plays: "990K",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=lofi-vibes-113884.mp3",
  },
  {
    id: "preset-8",
    title: "Safar",
    artist: "Bayaan, Sherazam",
    plays: "2.6M",
    coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=200&q=80",
    url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92db3.mp3?filename=soft-ambient-118546.mp3",
  },
];

export default function AddStory() {
  const navigate = useNavigate();
  const notify = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [dbSongs, setDbSongs] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Music State
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [audioStart, setAudioStart] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);

  // Modals State
  const [isSelectSongOpen, setIsSelectSongOpen] = useState(false);
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forYou" | "trending">("forYou");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview Audio Player in list & trimmer
  const [previewingSongUrl, setPreviewingSongUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!auth.currentUser) return;
      try {
        const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (uSnap.exists()) {
          setSellerInfo(uSnap.data());
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchSongs = async () => {
      try {
        const snap = await getDocs(collection(db, "story_songs"));
        const songsFromDb = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title,
          artist: d.data().artist || "Artist",
          coverUrl: d.data().coverUrl || "",
          url: d.data().url,
          plays: "Trending",
        }));
        setDbSongs(songsFromDb);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSeller();
    fetchSongs();
  }, []);

  const allSongs = [...dbSongs, ...PRESET_SONGS];

  const filteredSongs = allSongs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Audio preview playback handler
  const handleTogglePlaySong = (songUrl: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (previewingSongUrl === songUrl && isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(songUrl);
      audioPreviewRef.current = audio;
      audio.play().then(() => {
        setPreviewingSongUrl(songUrl);
        setIsPlayingPreview(true);
      }).catch(err => console.log("Audio play error", err));

      audio.onended = () => {
        setIsPlayingPreview(false);
      };
    }
  };

  const stopAudioPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setIsPlayingPreview(false);
  };

  const handleSelectSongRow = (song: any) => {
    stopAudioPreview();
    setSelectedSong(song);
    setAudioStart(0);
    setIsSelectSongOpen(false);
    setIsTrimmerOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newItems: { url: string; type: "image" | "video" }[] = [];

    for (const file of files) {
      try {
        if (file.type.startsWith("image/")) {
          const url = await uploadToImgbb(file);
          newItems.push({ url, type: "image" });
        } else if (file.type.startsWith("video/")) {
          const objectUrl = URL.createObjectURL(file);
          newItems.push({ url: objectUrl, type: "video" });
        }
      } catch (err: any) {
        notify(`Failed to upload ${file.name}: ${err.message}`, "error");
      }
    }

    setUploadedFiles((prev) => [...prev, ...newItems]);
    setUploading(false);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      notify("Please upload at least 1 image or video for story.", "error");
      return;
    }

    setSubmitting(true);
    try {
      for (const item of uploadedFiles) {
        await addDoc(collection(db, "stories"), {
          mediaUrl: item.url,
          type: item.type,
          category: sellerInfo?.shopName || sellerInfo?.displayName || "Story",
          linkUrl: linkUrl.trim(),
          duration: duration || 15,
          audioUrl: selectedSong?.url || null,
          songTitle: selectedSong?.title || "",
          songArtist: selectedSong?.artist || "",
          songCoverUrl: selectedSong?.coverUrl || "",
          audioStart: Number(audioStart) || 0,
          sellerId: auth.currentUser?.uid || "",
          sellerName: sellerInfo?.shopName || sellerInfo?.displayName || "Seller",
          sellerLogo: sellerInfo?.shopLogo || sellerInfo?.photoURL || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      notify("Stories uploaded successfully!", "success");
      navigate("/");
    } catch (err: any) {
      notify("Failed to publish story: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 min-h-screen">
      {/* Header without back button or glowing sparkles */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
          Create New Story
        </h1>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">
          Upload flash stories with custom images and background music.
        </p>
      </div>

      <div className="space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        {/* Upload Box */}
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 block">
            Upload Images / Videos *
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,video/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-pink-500 dark:hover:border-pink-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-pink-500">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold">Uploading media...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Click to choose photos or videos
                </span>
                <span className="text-[10px] text-zinc-400">Multiple images allowed</span>
              </>
            )}
          </div>
        </div>

        {/* Uploaded Previews */}
        {uploadedFiles.length > 0 && (
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 block">
              Uploaded Slides ({uploadedFiles.length})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black group border border-zinc-200 dark:border-zinc-800">
                  {file.type === "image" ? (
                    <img src={file.url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <video src={file.url} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-lg hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Link */}
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
            Target Product or Web Link (Optional)
          </label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="e.g. /product/123 or https://..."
            className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Background Music Selector UI */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
            <span>Background Music</span>
            {selectedSong && (
              <button
                onClick={() => setSelectedSong(null)}
                className="text-[10px] text-rose-500 font-bold hover:underline"
              >
                Remove Music
              </button>
            )}
          </label>

          {selectedSong ? (
            <div className="flex items-center justify-between p-3.5 bg-zinc-900 text-white dark:bg-zinc-800 rounded-2xl border border-zinc-700 shadow-md">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-700 shrink-0 border border-zinc-600 flex items-center justify-center">
                  {selectedSong.coverUrl ? (
                    <img src={selectedSong.coverUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Music className="w-5 h-5 text-pink-400" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs truncate">{selectedSong.title}</h4>
                  <p className="text-[11px] text-zinc-400 truncate">{selectedSong.artist}</p>
                  <p className="text-[10px] text-pink-400 font-mono mt-0.5">
                    Trimmed from {audioStart}s • Duration {duration}s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsTrimmerOpen(true)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[11px] font-bold transition-all"
                >
                  Trim
                </button>
                <button
                  onClick={() => setIsSelectSongOpen(true)}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-xl text-[11px] font-bold transition-all"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsSelectSongOpen(true)}
              className="w-full py-3.5 px-4 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex items-center justify-between text-zinc-700 dark:text-zinc-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Add Background Song</span>
              </div>
              <span className="text-xs font-bold text-pink-500">Select Music &rarr;</span>
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || uploadedFiles.length === 0}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Publishing Stories...</span>
            </>
          ) : (
            <span>Publish Story Slide(s)</span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SELECT SONG (Full Screen / Large Popup like Screenshot 1) */}
      {/* ========================================================= */}
      {isSelectSongOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex flex-col animate-fade-in max-w-md mx-auto my-auto h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          {/* Top Bar */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="w-8" />
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Select Song</h2>
            <button
              onClick={() => {
                stopAudioPreview();
                setIsSelectSongOpen(false);
              }}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-full bg-zinc-100 dark:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 pt-2 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lyrics, songs or artists..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-white text-xs font-medium placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-pink-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setActiveTab("forYou")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "forYou"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                For you
              </button>
              <button
                onClick={() => setActiveTab("trending")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "trending"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Trending
              </button>
            </div>
          </div>

          {/* Song List (Scrollable, slim full width rows with circular thumbnail) */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filteredSongs.map((song) => {
              const isPlayingThis = previewingSongUrl === song.url && isPlayingPreview;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSongRow(song)}
                  className="flex items-center justify-between gap-3 py-3 px-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer group transition-colors"
                >
                  {/* Left: Circular Image & Details */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Music className="w-5 h-5 text-pink-500" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-pink-500 transition-colors truncate">
                        {song.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {song.artist} {song.plays ? `• ${song.plays}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Right: Play/Pause Audio Preview Button */}
                  <button
                    onClick={(e) => handleTogglePlaySong(song.url, e)}
                    className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 transition-transform active:scale-90"
                    title="Play Preview"
                  >
                    {isPlayingThis ? (
                      <Pause className="w-4 h-4 text-pink-500 fill-pink-500" />
                    ) : (
                      <Play className="w-4 h-4 text-zinc-800 dark:text-white fill-zinc-800 dark:fill-white ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}

            {filteredSongs.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No songs match your search query.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: AUDIO TRIMMER POPUP (Matching Screenshot 2) */}
      {/* ========================================================= */}
      {isTrimmerOpen && selectedSong && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 text-zinc-900 dark:text-white shadow-2xl relative space-y-5">
            {/* Close Button */}
            <button
              onClick={() => {
                stopAudioPreview();
                setIsTrimmerOpen(false);
              }}
              className="absolute top-4 right-4 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-center font-bold text-sm text-zinc-800 dark:text-zinc-200">
              Trim Story Music
            </h3>

            {/* Visual Waveform Trimmer Bar (Matching Screenshot 2 handles!) */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="relative h-16 bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-between px-2 border border-zinc-200 dark:border-zinc-800">
                {/* Waveform Bars Representation */}
                <div className="absolute inset-0 flex items-center justify-around px-4 opacity-40">
                  <span className="w-1 h-8 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-12 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-6 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-10 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-14 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-7 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-11 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-5 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-9 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-12 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-8 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-14 bg-zinc-800 dark:bg-white rounded-full" />
                  <span className="w-1 h-6 bg-zinc-800 dark:bg-white rounded-full" />
                </div>

                {/* Highlighted Blue Selection Box with side handles (Screenshot 2 style) */}
                <div className="absolute inset-y-1 left-8 right-8 bg-blue-600/30 border-2 border-blue-500 rounded-xl flex items-center justify-between pointer-events-none">
                  <div className="w-2 h-full bg-blue-500 rounded-l-lg flex items-center justify-center">
                    <span className="w-0.5 h-4 bg-white rounded-full" />
                  </div>
                  <div className="w-2 h-full bg-blue-500 rounded-r-lg flex items-center justify-center">
                    <span className="w-0.5 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Start Time Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                  <span>Start Trim: {audioStart}s</span>
                  <span>Duration: {duration}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={audioStart}
                  onChange={(e) => setAudioStart(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                />
              </div>
            </div>

            {/* Song Card Bottom Bar (Matching Screenshot 2!) */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {/* Left Change Button */}
              <button
                onClick={() => {
                  stopAudioPreview();
                  setIsTrimmerOpen(false);
                  setIsSelectSongOpen(true);
                }}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 hover:bg-blue-500 transition-colors"
                title="Change Song"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Middle Song Info */}
              <div className="text-center overflow-hidden px-2">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{selectedSong.title}</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{selectedSong.artist}</p>
                <button
                  onClick={() => {
                    stopAudioPreview();
                    setIsTrimmerOpen(false);
                    setIsSelectSongOpen(true);
                  }}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline block mx-auto"
                >
                  Tap to change
                </button>
              </div>

              {/* Right Play Preview Button */}
              <button
                onClick={() => handleTogglePlaySong(selectedSong.url)}
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {previewingSongUrl === selectedSong.url && isPlayingPreview ? (
                  <Pause className="w-5 h-5 text-blue-500 fill-blue-500" />
                ) : (
                  <Play className="w-5 h-5 text-zinc-800 dark:text-white fill-zinc-800 dark:fill-white ml-0.5" />
                )}
              </button>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => {
                stopAudioPreview();
                setIsTrimmerOpen(false);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
            >
              Done & Attach Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
