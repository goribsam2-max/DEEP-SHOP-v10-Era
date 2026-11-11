import React, { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNotify } from "./Notifications";
import { triggerHaptic } from "../lib/haptics";
import { uploadFileToCatbox } from "../lib/catboxUpload";

export interface LiveGiftItem {
  id: string;
  name: string;
  emoji: string;
  coins: number;
}

export const LIVE_GIFTS: LiveGiftItem[] = [
  { id: "rose", name: "Rose", emoji: "🌹", coins: 5 },
  { id: "star", name: "Star", emoji: "⭐", coins: 10 },
  { id: "diamond", name: "Diamond", emoji: "💎", coins: 50 },
  { id: "crown", name: "Crown", emoji: "👑", coins: 100 },
  { id: "rocket", name: "Rocket", emoji: "🚀", coins: 500 },
];

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string; // If provided, joins as viewer; if empty, broadcaster mode
  initialTitle?: string;
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  streamId: viewerStreamId,
  initialTitle = "",
}) => {
  const notify = useNotify();
  const currentUser = auth.currentUser;

  // Broadcaster state
  const isBroadcaster = !viewerStreamId;
  const [activeStreamId, setActiveStreamId] = useState<string | null>(viewerStreamId || null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [streamData, setStreamData] = useState<any>(null);

  // Setup form
  const [title, setTitle] = useState(initialTitle || "My Live Stream");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  // Broadcaster hardware media
  const [streamSource, setStreamSource] = useState<"camera" | "screen">("camera");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);

  // Interactive Live elements
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [viewerCount, setViewerCount] = useState<number>(1);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
  const [showGiftDrawer, setShowGiftDrawer] = useState<boolean>(false);
  const [flyingHearts, setFlyingHearts] = useState<{ id: number; left: number }[]>([]);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Cleanup helper
  const stopLocalMedia = () => {
    if (localMediaStream) {
      localMediaStream.getTracks().forEach((t) => t.stop());
      setLocalMediaStream(null);
    }
  };

  // Start Media Stream for Broadcaster
  const startBroadcasterMedia = async (
    source: "camera" | "screen",
    facing: "user" | "environment"
  ) => {
    stopLocalMedia();
    try {
      let stream: MediaStream;
      if (source === "screen") {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          notify("Screen sharing is not supported on this browser/device.", "error");
          return;
        }
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      }
      setLocalMediaStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Could not start media stream:", err);
      notify("Camera or Screen permission denied / unavailable.", "error");
    }
  };

  // Switch camera facing
  const toggleCameraFacing = async () => {
    triggerHaptic();
    const next = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(next);
    if (streamSource === "camera") {
      await startBroadcasterMedia("camera", next);
    }
  };

  // Switch between camera and screen share
  const toggleStreamSource = async () => {
    triggerHaptic();
    const next = streamSource === "camera" ? "screen" : "camera";
    setStreamSource(next);
    await startBroadcasterMedia(next, cameraFacing);
  };

  // Toggle mic mute
  const toggleMic = () => {
    triggerHaptic();
    if (!localMediaStream) return;
    const next = !isMuted;
    localMediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
    notify(next ? "Microphone muted" : "Microphone active", "info");
  };

  // Upload thumbnail
  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumb(true);
    triggerHaptic();
    try {
      const url = await uploadFileToCatbox(file);
      if (url) {
        setThumbnailUrl(url);
        notify("Thumbnail uploaded!", "success");
      }
    } catch {
      notify("Failed to upload thumbnail", "error");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  // Start Live Broadcast
  const handleGoLive = async () => {
    if (!currentUser) {
      notify("Please sign in to go live.", "error");
      return;
    }
    triggerHaptic();
    try {
      const streamDocRef = doc(collection(db, "live_streams"));
      const newStreamId = streamDocRef.id;

      await setDoc(streamDocRef, {
        id: newStreamId,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Live Creator",
        userAvatar: currentUser.photoURL || "",
        title: title.trim() || "Live Discussion",
        description: description.trim(),
        thumbnailUrl: thumbnailUrl || "",
        sourceType: streamSource,
        status: "active",
        viewerCount: 1,
        startedAt: Date.now(),
        createdAt: serverTimestamp(),
      });

      // Update user doc with live status
      await updateDoc(doc(db, "users", currentUser.uid), {
        isLive: true,
        activeLiveStreamId: newStreamId,
      }).catch(() => {});

      setActiveStreamId(newStreamId);
      setIsLiveActive(true);
      notify("You are now LIVE! Everyone can see you.", "success");
    } catch (err: any) {
      notify(`Failed to start live: ${err?.message || "Error"}`, "error");
    }
  };

  // End Live Stream
  const handleEndLive = async () => {
    triggerHaptic();
    if (activeStreamId && isBroadcaster && currentUser) {
      try {
        await updateDoc(doc(db, "live_streams", activeStreamId), {
          status: "ended",
          endedAt: Date.now(),
        });
        await updateDoc(doc(db, "users", currentUser.uid), {
          isLive: false,
          activeLiveStreamId: null,
        }).catch(() => {});
        notify("Live stream ended successfully.", "info");
      } catch {}
    }
    stopLocalMedia();
    setIsLiveActive(false);
    onClose();
  };

  // Listen to Firestore active stream doc
  useEffect(() => {
    if (!activeStreamId) return;
    const unsub = onSnapshot(doc(db, "live_streams", activeStreamId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStreamData(data);
        setViewerCount(data.viewerCount || 1);
        if (data.status === "ended") {
          notify("This live stream has ended.", "info");
          if (!isBroadcaster) {
            onClose();
          }
        }
      }
    });
    return () => unsub();
  }, [activeStreamId, isBroadcaster]);

  // Listen to live stream comments in real time
  useEffect(() => {
    if (!activeStreamId) return;
    const qComments = query(
      collection(db, "live_streams", activeStreamId, "comments"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    const unsub = onSnapshot(qComments, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(list);
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsub();
  }, [activeStreamId]);

  // Listen to gifts in real time
  useEffect(() => {
    if (!activeStreamId) return;
    const qGifts = query(
      collection(db, "live_streams", activeStreamId, "gifts"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(qGifts, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentGifts(list);
    });
    return () => unsub();
  }, [activeStreamId]);

  // Post a live comment
  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim() || !activeStreamId || !currentUser) return;
    triggerHaptic();
    const txt = commentInput.trim();
    setCommentInput("");
    try {
      await addDoc(collection(db, "live_streams", activeStreamId, "comments"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "User",
        userAvatar: currentUser.photoURL || "",
        text: txt,
        createdAt: Date.now(),
      });
    } catch {}
  };

  // Send a gift
  const handleSendGift = async (gift: LiveGiftItem) => {
    if (!activeStreamId || !currentUser) return;
    triggerHaptic();
    setShowGiftDrawer(false);
    try {
      await addDoc(collection(db, "live_streams", activeStreamId, "gifts"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Supporter",
        userAvatar: currentUser.photoURL || "",
        giftId: gift.id,
        giftName: gift.name,
        giftEmoji: gift.emoji,
        coins: gift.coins,
        createdAt: Date.now(),
      });
      // Increment live stats
      await updateDoc(doc(db, "live_streams", activeStreamId), {
        totalGifts: increment(1),
      }).catch(() => {});
      notify(`Sent ${gift.emoji} ${gift.name}!`, "success");
    } catch {
      notify("Failed to send gift", "error");
    }
  };

  // Spawn flying hearts for tapping
  const handleTapHeart = () => {
    triggerHaptic();
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 40) + 50; // 50% to 90%
    setFlyingHearts((prev) => [...prev, { id, left }]);
    setTimeout(() => {
      setFlyingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  // Broadcaster starts camera on mount if open & not live yet
  useEffect(() => {
    if (isOpen && isBroadcaster && !isLiveActive) {
      startBroadcasterMedia("camera", "user");
    }
    return () => {
      if (!isLiveActive) {
        stopLocalMedia();
      }
    };
  }, [isOpen, isBroadcaster]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none">
      {/* 1. SETUP STAGE (Before clicking Go Live) */}
      {isBroadcaster && !isLiveActive ? (
        <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-between p-4 bg-zinc-950 text-white overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                stopLocalMedia();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition active:scale-95"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Icon name="radio" className="w-5 h-5 text-red-500 animate-pulse" />
              <h2 className="text-base font-bold">Go Live Studio</h2>
            </div>
            <div className="w-10" />
          </div>

          {/* Camera / Screen Preview */}
          <div className="relative w-full aspect-[9/14] my-3 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Quick Preview Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
              <button
                type="button"
                onClick={toggleCameraFacing}
                title="Flip Camera (Front/Back)"
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition active:scale-95"
              >
                <Icon name="refresh-cw" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleStreamSource}
                title={streamSource === "camera" ? "Switch to Screen Share" : "Switch to Camera"}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 transition active:scale-95"
              >
                {streamSource === "camera" ? <Icon name="monitor" className="w-4 h-4" /> : <Icon name="camera" className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
                className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/15 flex items-center justify-center transition active:scale-95 ${
                  isMuted ? "bg-red-500/80 text-white" : "bg-black/60 text-white"
                }`}
              >
                {isMuted ? <Icon name="mic-off" className="w-4 h-4" /> : <Icon name="mic" className="w-4 h-4" />}
              </button>
            </div>

            {/* Source label */}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90">
              {streamSource === "screen" ? "🖥️ Screen Sharing" : cameraFacing === "user" ? "🤳 Front Camera" : "📸 Back Camera"}
            </div>
          </div>

          {/* Form details: Title, Description, Thumbnail */}
          <div className="space-y-3 bg-zinc-900/80 p-4 rounded-3xl border border-white/10 mb-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Live Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your live stream a title..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add topics or details..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Thumbnail upload */}
            <div className="flex items-center justify-between pt-1">
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={isUploadingThumb}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                {isUploadingThumb ? <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="image" className="w-3.5 h-3.5" />}
                <span>{thumbnailUrl ? "Change Thumbnail" : "Add Thumbnail"}</span>
              </button>
              {thumbnailUrl && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Icon name="check-circle" className="w-3.5 h-3.5" />
                  <span>Thumbnail attached</span>
                </div>
              )}
            </div>
          </div>

          {/* Go Live Button */}
          <button
            type="button"
            onClick={handleGoLive}
            className="w-full py-4 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-98 transition cursor-pointer"
          >
            <Icon name="radio" className="w-5 h-5 animate-pulse" />
            <span>Go Live Now</span>
          </button>
        </div>
      ) : (
        /* 2. ACTIVE BROADCAST / VIEWER STAGE */
        <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-between bg-black text-white overflow-hidden">
          {/* Video Layer */}
          <div className="absolute inset-0 z-0">
            {isBroadcaster ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : streamData?.thumbnailUrl ? (
              <img
                src={streamData.thumbnailUrl}
                alt="Live stream"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full border-4 border-red-500 p-1 mb-3 animate-pulse">
                  <img
                    src={streamData?.userAvatar || "/assets/logo.png"}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-white">{streamData?.userName || "Creator"}</h3>
                <p className="text-zinc-400 text-xs mt-1">is broadcasting live</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>

          {/* Top Bar: Host info, LIVE badge, Viewer count, End/Leave button */}
          <div className="relative z-20 flex items-center justify-between p-4 pt-3">
            {/* Host pill */}
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
              <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-red-500">
                <img
                  src={
                    (isBroadcaster ? currentUser?.photoURL : streamData?.userAvatar) ||
                    "/assets/logo.png"
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="max-w-[120px] truncate">
                <p className="text-xs font-bold leading-tight truncate">
                  {isBroadcaster ? currentUser?.displayName || "You" : streamData?.userName || "Creator"}
                </p>
                <p className="text-[10px] text-zinc-300 leading-tight truncate">
                  {isBroadcaster ? title : streamData?.title || "Live"}
                </p>
              </div>
            </div>

            {/* LIVE Badge + Viewers */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1 shadow-md animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>LIVE</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white font-semibold text-xs flex items-center gap-1">
                <Icon name="eye" className="w-3.5 h-3.5" />
                <span>{viewerCount}</span>
              </div>

              {/* End / Close button */}
              <button
                type="button"
                onClick={isBroadcaster ? handleEndLive : onClose}
                className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition cursor-pointer active:scale-95"
              >
                {isBroadcaster ? "End Live" : "Leave"}
              </button>
            </div>
          </div>

          {/* Broadcaster Quick Toolbar (Camera flip, Screen share, Mute) */}
          {isBroadcaster && (
            <div className="relative z-20 flex items-center justify-end px-4 gap-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition"
              >
                <Icon name="refresh-cw" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleStreamSource}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition"
              >
                {streamSource === "camera" ? <Icon name="monitor" className="w-4 h-4" /> : <Icon name="camera" className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                className={`w-9 h-9 rounded-full backdrop-blur-md border border-white/15 flex items-center justify-center transition active:scale-95 ${
                  isMuted ? "bg-red-500 text-white" : "bg-black/50 text-white"
                }`}
              >
                {isMuted ? <Icon name="mic-off" className="w-4 h-4" /> : <Icon name="mic" className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Flying Hearts Animation Layer */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {flyingHearts.map((heart) => (
              <div
                key={heart.id}
                style={{ left: `${heart.left}%` }}
                className="absolute bottom-20 text-3xl animate-bounce transition-all duration-1000 opacity-90"
              >
                ❤️
              </div>
            ))}
          </div>

          {/* Recent Gifts Floating Banner */}
          {recentGifts.length > 0 && (
            <div className="relative z-20 px-4 mb-2 pointer-events-none">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-xl animate-pulse">
                <span className="text-xl">{recentGifts[0].giftEmoji}</span>
                <span className="text-xs font-bold text-white">
                  {recentGifts[0].userName} sent a {recentGifts[0].giftName}!
                </span>
              </div>
            </div>
          )}

          {/* Bottom Area: Live Comments Stream & Inputs */}
          <div className="relative z-20 p-4 pb-6 space-y-3">
            {/* Scrolling Live Comments */}
            <div className="h-44 overflow-y-auto no-scrollbar space-y-2 flex flex-col justify-end pointer-events-auto mask-top">
              {comments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="inline-flex items-start gap-2 bg-black/45 backdrop-blur-xs px-3 py-1.5 rounded-2xl max-w-[85%] border border-white/10"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 shrink-0 mt-0.5">
                    {cmt.userAvatar ? (
                      <img src={cmt.userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] flex items-center justify-center font-bold">
                        {(cmt.userName || "U")[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-pink-400 mr-1.5">
                      {cmt.userName}:
                    </span>
                    <span className="text-xs text-white/95 break-words">{cmt.text}</span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input Bar + Gift + Heart Tap */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendComment} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Say something nice..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white placeholder-white/60 text-xs focus:outline-none focus:border-white/40"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:opacity-90 active:scale-95 transition disabled:opacity-40 cursor-pointer"
                >
                  <Icon name="send" className="w-4 h-4" />
                </button>
              </form>

              {/* Gift Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowGiftDrawer((prev) => !prev);
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-md cursor-pointer"
                title="Send Gift"
              >
                <Icon name="gift" className="w-4 h-4" />
              </button>

              {/* Heart Tap Button */}
              <button
                type="button"
                onClick={handleTapHeart}
                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition shadow-md cursor-pointer"
                title="Send Love"
              >
                <Icon name="heart" className="w-4 h-4" />
              </button>
            </div>

            {/* Gift Drawer */}
            {showGiftDrawer && (
              <div className="bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-4 border border-white/15 shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Icon name="gift" className="w-4 h-4 text-pink-400" />
                    <span>Send a Gift to Creator</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowGiftDrawer(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 pt-3">
                  {LIVE_GIFTS.map((gift) => (
                    <button
                      key={gift.id}
                      type="button"
                      onClick={() => handleSendGift(gift)}
                      className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition active:scale-95 cursor-pointer"
                    >
                      <span className="text-2xl">{gift.emoji}</span>
                      <span className="text-[11px] font-bold text-white mt-1">{gift.name}</span>
                      <span className="text-[9px] text-amber-400">{gift.coins} coins</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
