import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify, useConfirm } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import Icon from "../../components/Icon";
import { Play } from "lucide-react";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle, ItemActions } from "../../components/ui/item";
import { Button } from "../../components/ui/button";
import ReactPlayer from "react-player";
const Player: any = ReactPlayer;

const PRESET_SONGS = [
  {
    name: "LoFi Chill",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
  },
  {
    name: "Upbeat Corporate",
    url: "https://cdn.pixabay.com/download/audio/2022/10/24/audio_34b4ce6dcb.mp3?filename=uplifting-upbeat-corporate-125086.mp3",
  },
  {
    name: "Cyberpunk Action",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_249ea36566.mp3?filename=cyberpunk-2099-10701.mp3",
  },
  {
    name: "Epic Cinematic",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=epic-hollywood-trailer-9489.mp3",
  },
  {
    name: "Pop Vibe",
    url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3",
  },
  {
    name: "YT Playlist Track 1",
    url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3",
  },
  {
    name: "YT Playlist Track 2",
    url: "https://cdn.pixabay.com/download/audio/2021/11/24/audio_a1622f98f6.mp3?filename=modern-vlog-140795.mp3",
  },
];

import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../components/ui/modal-drop";

const ManageStories: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stories, setStories] = useState<any[]>([]);
  const [dbSongs, setDbSongs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"stories" | "songs">("stories");
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);

  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songCoverUrl, setSongCoverUrl] = useState("");
  const [songMp3Url, setSongMp3Url] = useState("");
  const [songCoverUploading, setSongCoverUploading] = useState(false);

  const handleSongCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSongCoverUploading(true);
    try {
      const url = await uploadToImgbb(file);
      setSongCoverUrl(url);
      notify("Cover image uploaded successfully!", "success");
    } catch (err: any) {
      notify("Failed to upload cover: " + err.message, "error");
    } finally {
      setSongCoverUploading(false);
    }
  };

  const [type, setType] = useState<"image" | "video">("image");
  const [category, setCategory] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Audio Selection
  const [songSource, setSongSource] = useState<"preset" | "custom">("preset");
  const [selectedSongUrl, setSelectedSongUrl] = useState("");
  const [customSongUrl, setCustomSongUrl] = useState("");
  const [audioStart, setAudioStart] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "stories"), (snap) => {
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubSongs = onSnapshot(collection(db, "story_songs"), (snap) => {
      setDbSongs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubscribe();
      unsubSongs();
    };
  }, []);

  const handleSaveSong = async () => {
    if (!songTitle.trim() || !songMp3Url.trim()) {
      notify("Please fill song title and MP3/GitHub URL", "error");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "story_songs"), {
        title: songTitle.trim(),
        artist: songArtist.trim() || "Unknown Artist",
        coverUrl: songCoverUrl.trim() || "",
        url: songMp3Url.trim(),
        createdAt: Date.now()
      });
      notify("Song added successfully!", "success");
      setSongTitle("");
      setSongArtist("");
      setSongCoverUrl("");
      setSongMp3Url("");
      setIsAddingSong(false);
    } catch (e: any) {
      notify("Failed to save song: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (await confirm({ title: "Delete Song", message: "Are you sure you want to delete this background song?" })) {
      try {
        await deleteDoc(doc(db, "story_songs", id));
        notify("Song deleted", "success");
      } catch (e) {
        notify("Failed to delete song", "error");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const url = await uploadToImgbb(file);
      setPreviewUrl(url);
    } catch {
      notify("Failed to upload image", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (story: any) => {
    setEditStoryId(story.id);
    setType(story.type);
    setCategory(story.category);
    setLinkUrl(story.linkUrl || "");
    if (story.type === "image") {
      setPreviewUrl(story.mediaUrl);
      setVideoUrl("");
    } else {
      setVideoUrl(story.mediaUrl);
      setPreviewUrl("");
    }
    
    if (story.audioUrl) {
      if (PRESET_SONGS.some(s => s.url === story.audioUrl)) {
        setSongSource("preset");
        setSelectedSongUrl(story.audioUrl);
      } else {
        setSongSource("custom");
        setCustomSongUrl(story.audioUrl);
      }
    } else {
      setSongSource("preset");
      setSelectedSongUrl("");
      setCustomSongUrl("");
    }
    setAudioStart(story.audioStart || 0);
    setIsAdding(true);
  };

  const resetForm = () => {
    setEditStoryId(null);
    setCategory("");
    setType("image");
    setPreviewUrl("");
    setVideoUrl("");
    setLinkUrl("");
    setSelectedSongUrl("");
    setCustomSongUrl("");
    setAudioStart(0);
  };

  const handleSave = async () => {
    if (
      !category ||
      (type === "image" && !previewUrl) ||
      (type === "video" && !videoUrl)
    ) {
      return notify("Please fill required fields", "error");
    }

    const finalAudioUrl =
      songSource === "preset" ? selectedSongUrl : customSongUrl;

    setLoading(true);
    try {
      const storyData = {
        type,
        category: category.trim(),
        mediaUrl: type === "image" ? previewUrl : videoUrl,
        linkUrl: linkUrl.trim(),
        duration: type === "image" ? 10 : 15,
        audioUrl: finalAudioUrl || null,
        audioStart: Number(audioStart) || 0,
        updatedAt: new Date().toISOString(),
      };

      if (editStoryId) {
        await updateDoc(doc(db, "stories", editStoryId), storyData);
        notify("Story updated", "success");
      } else {
        await addDoc(collection(db, "stories"), {
          ...storyData,
          createdAt: new Date().toISOString(),
        });
        notify("Story saved", "success");
      }
      setIsAdding(false);
      resetForm();
    } catch (e) {
      notify("Failed to save story", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: "Delete Story",
      message: "Are you sure you want to delete this story?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "stories", id));
          notify("Story deleted", "success");
        } catch (e) {
          notify("Failed to delete", "error");
        }
      }
    });
  };

  const finalAudioPreviewUrl =
    songSource === "preset" ? selectedSongUrl : customSongUrl;

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-10 min-h-screen bg-zinc-50 dark:bg-zinc-800 animate-fade-in relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
            Stories & Songs Manager
          </h1>
          <p className="text-zinc-400 text-xs font-medium">
             Manage active seller flash stories & background music tracks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200 dark:bg-zinc-800 rounded-2xl border border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => setActiveTab("stories")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "stories"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Stories ({stories.length})
            </button>
            <button
              onClick={() => setActiveTab("songs")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "songs"
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Story Songs ({dbSongs.length})
            </button>
          </div>

          {activeTab === "stories" ? (
            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add Story
            </button>
          ) : (
            <button
              onClick={() => setIsAddingSong(true)}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95 bg-pink-600 text-white hover:bg-pink-700"
            >
              + Add Song
            </button>
          )}
        </div>
      </div>

      {/* Modal for Adding Song */}
      <Modal
        isOpen={isAddingSong}
        onClose={() => setIsAddingSong(false)}
        title="Add Background Song (MP3 / Audio)"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">Song Title *</label>
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="e.g. Lofi Vibes - Bengali Beats"
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">Artist Name</label>
            <input
              type="text"
              value={songArtist}
              onChange={(e) => setSongArtist(e.target.value)}
              placeholder="e.g. Artist / Musician"
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">MP3 Audio Direct Link *</label>
            <input
              type="text"
              value={songMp3Url}
              onChange={(e) => setSongMp3Url(e.target.value)}
              placeholder="https://.../song.mp3"
              className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Paste any valid MP3 or CDN audio URL.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
              Cover Image (ImgBB Upload or Image URL)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={songCoverUrl}
                onChange={(e) => setSongCoverUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium"
              />
              <label className="px-3.5 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-pink-500/20 flex items-center gap-1.5 shrink-0">
                {songCoverUploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <Icon name="upload" className="text-xs" />
                    <span>Upload Cover</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSongCoverUpload}
                  className="hidden"
                />
              </label>
            </div>
            {songCoverUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={songCoverUrl} className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" alt="Cover Preview" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Cover attached!</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => setIsAddingSong(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSong}
              disabled={loading}
              className="px-5 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Song"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          resetForm();
        }}
        title={editStoryId ? "Edit Story" : "Add Story"}
        animationType="scale"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm" placeholder="e.g. Offers" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">Link URL (Optional)</label>
            <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm">
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          {type === 'image' ? (
             <div>
                <label className="block text-xs font-semibold mb-2">Upload Image</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
             </div>
          ) : (
             <div>
                <label className="block text-xs font-semibold mb-2">Media URL (Video / YouTube / TikTok / GitHub)</label>
                <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm" placeholder="URL" />
             </div>
          )}

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold mb-4">Background Music</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="radio" checked={songSource === 'preset'} onChange={() => setSongSource('preset')} className="accent-zinc-900 dark:accent-white" />
                Preset Music
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="radio" checked={songSource === 'custom'} onChange={() => setSongSource('custom')} className="accent-zinc-900 dark:accent-white" />
                Custom Audio URL
              </label>
            </div>
            {songSource === 'preset' ? (
              <select value={selectedSongUrl} onChange={e => setSelectedSongUrl(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm mb-4">
                <option value="">No Background Music</option>
                {PRESET_SONGS.map(song => (
                  <option key={song.name} value={song.url}>{song.name}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={customSongUrl} onChange={e => setCustomSongUrl(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm mb-4" placeholder="Enter custom audio URL..." />
            )}
            <div>
              <label className="block text-xs font-semibold mb-2">Audio Start Time (seconds for trim)</label>
              <input type="number" value={audioStart} onChange={e => setAudioStart(Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-[#121212] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm" placeholder="0" min="0" />
            </div>
            {finalAudioPreviewUrl && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Audio Preview (Test Trim):</p>
                <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-black">
                  <Player 
                    url={finalAudioPreviewUrl} 
                    controls 
                    width="100%" 
                    height="50px" 
                    onReady={(p: any) => { if (audioStart) p.seekTo(audioStart, 'seconds'); }}
                    config={{
                      youtube: {
                        playerVars: { start: audioStart || 0 } as any
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-lg text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-800 text-sm font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
               Cancel
            </button>
            <button onClick={handleSave} disabled={loading} className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition">
               {loading ? "Saving..." : (editStoryId ? "Update Story" : "Save Story")}
            </button>
          </div>
        </div>
      </Modal>

      <div className="max-w-5xl mx-auto relative z-10">
        {activeTab === "songs" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbSongs.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center shrink-0 border border-pink-500/20 font-black text-sm overflow-hidden">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      "🎵"
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{song.title}</h3>
                    <p className="text-xs text-zinc-400 truncate">{song.artist || "Unknown Artist"}</p>
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-pink-500 hover:underline truncate block"
                    >
                      {song.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteSong(song.id)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Delete Song"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
              </div>
            ))}

            {dbSongs.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-xs font-bold text-zinc-400 mb-3">No custom songs added yet.</p>
                <button
                  onClick={() => setIsAddingSong(true)}
                  className="px-4 py-2 bg-pink-600 text-white font-bold text-xs rounded-xl"
                >
                  + Add First Song
                </button>
              </div>
            )}
          </div>
        ) : (
          <ItemGroup className="flex flex-col gap-4">
            {stories.map((story) => (
              <details key={story.id} className="group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300" open={false}>
                <summary className="flex cursor-pointer items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-4 w-full">
                    <ItemMedia variant="image" className="size-12 shrink-0 border border-border p-1 bg-muted relative">
                      {story.type === "video" ? (
                        <>
                          <div className="w-full h-full pointer-events-none">
                            {/* @ts-ignore */}
                            <Player url={story.mediaUrl} width="100%" height="100%" playing={false} controls={false} light={true} style={{objectFit: 'cover'}} />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <Play className="size-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <img src={story.mediaUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </ItemMedia>
                    <ItemContent className="flex-1 overflow-hidden pr-2">
                      <ItemTitle className="truncate">{story.category}</ItemTitle>
                      <ItemDescription className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-xs uppercase bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-sm shrink-0">{story.type}</span>
                        <span className="truncate">{story.linkUrl || "No Link Provided"}</span>
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="justify-end shrink-0 ml-auto flex items-center gap-2 z-10 bg-zinc-50 dark:bg-zinc-800/50">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(story); }}>
                        <Icon name="pencil" className="size-3" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(story.id); }}>
                        <Icon name="trash" className="size-3" />
                      </Button>
                    </ItemActions>
                  </div>
                </summary>
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-center">
                  <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-2xl overflow-hidden bg-black shadow-lg">
                    {story.type === "video" ? (
                      /* @ts-ignore */
                      <Player url={story.mediaUrl} width="100%" height="100%" playing={true} controls={true} muted={true} loop={true} />
                    ) : (
                      <img src={story.mediaUrl} className="w-full h-full object-contain bg-zinc-950" alt="" />
                    )}
                  </div>
                </div>
              </details>
            ))}
            {stories.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 border border-solid border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <Icon name="layer-group" className="text-zinc-300 text-lg mb-4" />
                <p className="text-xs font-bold  tracking-normal text-zinc-400">
                  No stories active
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setIsAdding(true);
                  }}
                  className="mt-4 text-[10px] font-bold  tracking-normal text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Create First Story
                </button>
              </div>
            )}
          </ItemGroup>
        )}
      </div>
    </div>
  );
};
export default ManageStories;
