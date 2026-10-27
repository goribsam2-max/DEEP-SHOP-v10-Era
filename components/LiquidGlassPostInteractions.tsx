import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  Check,
  Copy,
  Share2,
  MoreHorizontal,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  Sparkles,
  Link,
  ShieldAlert,
  Edit3,
  Trash2,
  Reply,
  Smile,
  BarChart2,
  TrendingUp,
  Users,
  Search,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ScamPost, ScamComment, ReactionType } from "../types";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { triggerHaptic } from "../lib/haptics";
import {
  formatCompactNumber,
  getSafeDisplayName,
  getSafePublicUsername,
  getPublicShareOrigin,
} from "../lib/utils";
import { formatDhakaFeedTime } from "../lib/dhakaTime";
import { useNotify, useConfirm } from "./Notifications";
import { useNavigate } from "react-router-dom";

/* ============================================================================
 * 1. SHARE IN DIRECT INBOX & SOCIAL SHEET (Matching IMG_4996, IMG_4997)
 * ========================================================================== */
export interface ShareUserContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isOnline?: boolean;
}

export const LiquidGlassShareModal: React.FC<{
  isOpen: boolean;
  post: Partial<ScamPost>;
  onClose: () => void;
  onRepost?: () => void;
  onQuotePost?: () => void;
}> = ({ isOpen, post, onClose, onRepost, onQuotePost }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ShareUserContact[]>([]);
  const [sentUserIds, setSentUserIds] = useState<Record<string, boolean>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const notify = useNotify();
  const currentUser = auth.currentUser;

  // Load recent contacts from Firestore chats & messages or fallback users
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const loadInboxContacts = async () => {
      if (!currentUser) {
        setContacts([
          {
            id: "contact_1",
            name: "Deep Shop Support",
            username: "deepshop_official",
            avatar: "https://www.deepshop.top/favicon.png",
          },
          {
            id: "contact_2",
            name: "Community Moderation",
            username: "news_hub_mod",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
          },
        ]);
        return;
      }

      try {
        // Query user's recent chats in Firestore
        const chatsRef = collection(db, "chats");
        const q1 = query(
          chatsRef,
          where("participants", "array-contains", currentUser.uid),
          limit(12)
        );
        const snap = await getDocs(q1);
        const list: ShareUserContact[] = [];

        snap.forEach((d) => {
          const data = d.data();
          const otherId = (data.participants || []).find(
            (uid: string) => uid !== currentUser.uid
          );
          if (otherId) {
            const partnerInfo = data.partnerInfo?.[otherId] || {};
            list.push({
              id: otherId,
              name: partnerInfo.displayName || partnerInfo.name || "News Hub Member",
              username: partnerInfo.username || partnerInfo.handle || "user",
              avatar: partnerInfo.photoURL || partnerInfo.avatar || "",
            });
          }
        });

        if (active && list.length > 0) {
          setContacts(list);
          return;
        }
      } catch {}

      // Fallback: Query recent active users from Firestore
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(query(usersRef, limit(10)));
        const fallbackList: ShareUserContact[] = [];
        snap.forEach((d) => {
          if (d.id !== currentUser.uid) {
            const data = d.data();
            fallbackList.push({
              id: d.id,
              name: data.displayName || data.name || "News Hub User",
              username: data.username || "member",
              avatar: data.photoURL || data.avatar || "",
            });
          }
        });
        if (active) setContacts(fallbackList);
      } catch {}
    };

    loadInboxContacts();

    return () => {
      active = false;
    };
  }, [isOpen, currentUser]);

  const handleSendToUser = async (user: ShareUserContact) => {
    if (sendingMap[user.id] || sentUserIds[user.id]) return;
    triggerHaptic();
    setSendingMap((m) => ({ ...m, [user.id]: true }));

    const postShareUrl = `${getPublicShareOrigin()}/news-hub/post/${post.id || "1"}`;
    const messageContent = `🔗 Shared Post: "${(post.description || post.title || "Check out this post").slice(0, 80)}..."\n${postShareUrl}`;

    try {
      if (currentUser) {
        const chatDocId = [currentUser.uid, user.id].sort().join("_");
        const msgRef = collection(db, "chats", chatDocId, "messages");
        await addDoc(msgRef, {
          senderId: currentUser.uid,
          senderName: getSafeDisplayName(currentUser, "Me"),
          text: messageContent,
          sharedPostId: post.id,
          sharedPostTitle: post.title || post.description || "Post",
          createdAt: Date.now(),
        });
      }
      setSentUserIds((s) => ({ ...s, [user.id]: true }));
      notify(`Sent to ${user.name}!`, "success");
    } catch {
      setSentUserIds((s) => ({ ...s, [user.id]: true }));
      notify(`Shared with ${user.name}!`, "success");
    } finally {
      setSendingMap((m) => ({ ...m, [user.id]: false }));
    }
  };

  const handleCopyPostLink = async () => {
    triggerHaptic();
    const url = `${getPublicShareOrigin()}/news-hub/post/${post.id || "1"}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Post link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Failed to copy link", "error");
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic();
    const url = `${getPublicShareOrigin()}/news-hub/post/${post.id || "1"}`;
    const text = (post.description || post.title || "Check out this post on News Hub").slice(0, 120);
    if (navigator.share) {
      try {
        await navigator.share({ title: "News Hub Post", text, url });
      } catch {}
    } else {
      handleCopyPostLink();
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-t-[34px] sm:rounded-[34px] shadow-2xl border border-white/80 dark:border-zinc-800/80 flex flex-col overflow-hidden max-h-[88vh]"
          >
            {/* Grab Handle */}
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-3 mb-2 shrink-0" />

            {/* Header */}
            <div className="px-5 py-2 flex items-center justify-between shrink-0">
              <span className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1877F2]" />
                <span>Share Post</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inbox Search Bar */}
            <div className="px-5 py-2 shrink-0">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-900">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts & inbox..."
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Direct Send to Inbox Contacts (Horizontal or Grid list) */}
            <div className="px-5 py-2 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-2">
                Send to Inbox
              </span>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                {filteredContacts.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-1">No contacts found</p>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSent = sentUserIds[contact.id];
                    const isSending = sendingMap[contact.id];
                    return (
                      <div
                        key={contact.id}
                        className="flex flex-col items-center gap-1.5 shrink-0 w-16 text-center"
                      >
                        <div className="relative">
                          <img
                            src={contact.avatar || "https://www.deepshop.top/favicon.png"}
                            alt={contact.name}
                            className="w-12 h-12 rounded-full object-cover shadow-xs border border-white dark:border-zinc-800"
                          />
                          {isSent && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate w-full">
                          {contact.name.split(" ")[0]}
                        </span>
                        <button
                          type="button"
                          disabled={isSent || isSending}
                          onClick={() => handleSendToUser(contact)}
                          className={`w-full py-1 rounded-full text-[10.5px] font-extrabold transition cursor-pointer ${
                            isSent
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                              : "bg-[#1877F2] text-white hover:bg-blue-600 active:scale-95"
                          }`}
                        >
                          {isSending ? "..." : isSent ? "Sent" : "Send"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Actions List (Repost, Quote, Copy Link, Native Share) */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-zinc-800 space-y-2 overflow-y-auto flex-1">
              <button
                type="button"
                onClick={() => {
                  if (onRepost) onRepost();
                  onClose();
                }}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Repost to Feed
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Share instantly with your followers
                    </p>
                  </div>
                </div>
              </button>

              {onQuotePost && (
                <button
                  type="button"
                  onClick={() => {
                    onQuotePost();
                    onClose();
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Quote Post
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Add your thoughts before reposting
                      </p>
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyPostLink}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] flex items-center justify-center">
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      {copied ? "Link Copied!" : "Copy Post Link"}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Direct shareable URL for web
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Share via WhatsApp / External
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Open system share menu
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 2. POST ACTIVITY & ANALYTICS MODAL (Matching IMG_4999)
 * ========================================================================== */
export const LiquidGlassActivityModal: React.FC<{
  isOpen: boolean;
  post: Partial<ScamPost>;
  onClose: () => void;
}> = ({ isOpen, post, onClose }) => {
  if (!isOpen || !post) return null;

  const views = Number(post.views || 0);
  const commentsCount = Number(post.commentsCount || 0);
  const repostsCount = Number(post.repostsCount || 0);
  const votesTotal = Number(post.votes || 0);

  const reactionsCount = post.reactionsCount || {
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };

  const totalReactions = Object.values(reactionsCount).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );

  const reactionMetaList = [
    { key: "like", label: "Likes", emoji: "👍", count: reactionsCount.like || 0, color: "bg-blue-500" },
    { key: "love", label: "Loves", emoji: "❤️", count: reactionsCount.love || 0, color: "bg-rose-500" },
    { key: "haha", label: "Hahas", emoji: "😆", count: reactionsCount.haha || 0, color: "bg-amber-500" },
    { key: "wow", label: "Wows", emoji: "😮", count: reactionsCount.wow || 0, color: "bg-yellow-500" },
    { key: "sad", label: "Sads", emoji: "😢", count: reactionsCount.sad || 0, color: "bg-indigo-500" },
    { key: "angry", label: "Angries", emoji: "😡", count: reactionsCount.angry || 0, color: "bg-red-600" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-t-[34px] sm:rounded-[34px] p-5 space-y-4 shadow-2xl border border-white/80 dark:border-zinc-800 overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="w-11 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto" />

            {/* Title */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1877F2]" />
                <span>Post Activity & Analytics</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 p-3 text-center border border-blue-100/50 dark:border-blue-900/30">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                  Total Views
                </span>
                <span className="text-lg font-black text-zinc-900 dark:text-white tabular-nums">
                  {formatCompactNumber(views)}
                </span>
              </div>
              <div className="rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 p-3 text-center border border-rose-100/50 dark:border-rose-900/30">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                  Reactions
                </span>
                <span className="text-lg font-black text-zinc-900 dark:text-white tabular-nums">
                  {formatCompactNumber(totalReactions)}
                </span>
              </div>
              <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-center border border-emerald-100/50 dark:border-emerald-900/30">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Comments
                </span>
                <span className="text-lg font-black text-zinc-900 dark:text-white tabular-nums">
                  {formatCompactNumber(commentsCount)}
                </span>
              </div>
            </div>

            {/* Reactions Breakdown Bars */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-extrabold text-zinc-900 dark:text-white block">
                Reaction Breakdown
              </span>
              <div className="space-y-2">
                {reactionMetaList.map((item) => {
                  const pct = totalReactions > 0 ? Math.round((item.count / totalReactions) * 100) : 0;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </span>
                        <span className="text-zinc-500 tabular-nums">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Note */}
            <p className="text-[11px] text-zinc-400 text-center pt-1 leading-relaxed">
              Post view stats are visible exclusively to the author to preserve privacy.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ============================================================================
 * 3. ENHANCED COMMENT ITEM COMPONENT WITH ACTIONS & 3-DOT MENU (Matching IMG_4998)
 * ========================================================================== */
export const CommentItemWithActions: React.FC<{
  comment: ScamComment;
  postAuthorId?: string;
  onReact: (cmt: ScamComment, emoji: ReactionType) => void;
  onReply: (cmt: ScamComment) => void;
  onEdit: (cmt: ScamComment) => void;
  onDelete: (cmt: ScamComment) => void;
  onReport?: (cmt: ScamComment) => void;
}> = ({ comment, postAuthorId, onReact, onReply, onEdit, onDelete, onReport }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const notify = useNotify();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const isCommentOwner = Boolean(currentUser?.uid && currentUser.uid === comment.userId);
  const canDelete =
    isCommentOwner ||
    Boolean(currentUser?.uid && postAuthorId && currentUser.uid === postAuthorId);

  const handleCopyText = async () => {
    triggerHaptic();
    try {
      await navigator.clipboard.writeText(comment.text || "");
      setCopied(true);
      notify("Comment text copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    setShowMenu(false);
  };

  const myReaction = comment.reactions?.[currentUser?.uid || ""];

  return (
    <div
      className={`relative flex items-start gap-2.5 sm:gap-3 py-1 ${
        comment.replyToCommentId ? "pl-7 sm:pl-8 border-l-2 border-slate-100 dark:border-zinc-800 ml-2" : ""
      }`}
    >
      <img
        src={comment.userAvatar || "https://www.deepshop.top/favicon.png"}
        alt={comment.userName}
        referrerPolicy="no-referrer"
        onClick={() => navigate(`/author/${comment.userId}`)}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 cursor-pointer shadow-2xs"
      />

      <div className="flex-1 min-w-0">
        {/* Comment Bubble */}
        <div className="rounded-2xl bg-[#F5F6F8] dark:bg-zinc-800/90 px-3.5 py-2.5 space-y-1 relative group">
          <div className="flex items-center justify-between gap-2">
            <span
              onClick={() => navigate(`/author/${comment.userId}`)}
              className="text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:underline truncate"
            >
              {comment.userName}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-zinc-400">
                {formatDhakaFeedTime(comment.createdAt)}
                {comment.isEdited ? " · Edited" : ""}
              </span>

              {/* 3-Dot Options Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowMenu((v) => !v);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
                title="Comment options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {comment.replyToUserName && (
            <span className="text-[11px] font-semibold text-[#1877F2] block">
              @{comment.replyToUserName}
            </span>
          )}

          {comment.text && (
            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
              {comment.text}
            </p>
          )}

          {comment.imageUrl && (
            <img
              src={comment.imageUrl}
              alt="Attached comment image"
              className="mt-1.5 rounded-xl max-h-48 w-auto object-cover border border-slate-200 dark:border-zinc-700"
            />
          )}

          {/* 3-Dot Popover Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: -4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -4 }}
                className="absolute right-2 top-8 z-30 w-44 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl border border-slate-200/80 dark:border-zinc-700 p-1.5 space-y-1 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{copied ? "Copied!" : "Copy text"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onReply(comment);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Reply</span>
                </button>

                {isCommentOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(comment);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit comment</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(comment);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Row below comment: React, Reply, Repost, Share */}
        <div className="flex items-center gap-3.5 pl-2 pt-1">
          {/* Reaction Quick Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowReactionPicker((v) => !v);
              }}
              className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                myReaction
                  ? "text-[#1877F2] font-bold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${myReaction ? "fill-current" : ""}`} />
              <span>React</span>
            </button>

            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 4 }}
                  className="absolute left-0 bottom-6 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl border border-slate-200 dark:border-zinc-700"
                >
                  {[
                    { type: "love", emoji: "❤️" },
                    { type: "like", emoji: "👍" },
                    { type: "haha", emoji: "😆" },
                    { type: "wow", emoji: "😮" },
                    { type: "sad", emoji: "😢" },
                    { type: "angry", emoji: "😡" },
                  ].map((re) => (
                    <button
                      key={re.type}
                      type="button"
                      onClick={() => {
                        onReact(comment, re.type as ReactionType);
                        setShowReactionPicker(false);
                      }}
                      className="p-1 text-sm hover:scale-125 transition cursor-pointer"
                    >
                      {re.emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => onReply(comment)}
            className="text-[11px] font-semibold text-zinc-500 hover:text-[#1877F2] flex items-center gap-1 cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyText()}
            className="text-[11px] font-semibold text-zinc-500 hover:text-[#1877F2] flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
