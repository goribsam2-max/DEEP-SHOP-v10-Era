import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, X, MessageSquare, Star, UserPlus, ShieldAlert, Check } from "lucide-react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { toggleFollowUser, useFollowedIds } from "../lib/follow";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { ProfileAvatar } from "./NewsProfilePage";

interface NewsNotificationItem {
  id: string;
  userId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserUsername?: string;
  fromUserAvatar?: string;
  type: "follow" | "like" | "story_like" | "comment" | "repost" | "story" | "system";
  title?: string;
  body: string;
  mediaThumbnail?: string;
  targetId?: string;
  createdAt: number;
  read?: boolean;
  link?: string;
}

function formatCompactTimeAgo(ts: number | string): string {
  const ms = typeof ts === "number" ? ts : new Date(ts).getTime();
  if (!ms || isNaN(ms)) return "Just now";
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${Math.max(1, sec)}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getTimeGroup(ts: number | string): "New" | "Yesterday" | "Last 7 days" | "Earlier" {
  const ms = typeof ts === "number" ? ts : new Date(ts).getTime();
  if (!ms || isNaN(ms)) return "New";
  const hoursAgo = (Date.now() - ms) / (1000 * 60 * 60);
  if (hoursAgo < 24) return "New";
  if (hoursAgo < 48) return "Yesterday";
  if (hoursAgo < 24 * 7) return "Last 7 days";
  return "Earlier";
}

export const NewsHubNotifications: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [notifications, setNotifications] = useState<NewsNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  const followedIds = useFollowedIds(currentUser?.uid);

  // Preferences toggles
  const [prefs, setPrefs] = useState({
    comments: true,
    follows: true,
    stars: true,
    scamAlerts: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // Real-time listener for News Hub notifications in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const qNews = query(
      collection(db, "news_hub_notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubNews = onSnapshot(
      qNews,
      (snap) => {
        const list: NewsNotificationItem[] = snap.docs.map((d) => {
          const data = d.data();
          const rawDate = data.createdAt;
          const ts = typeof rawDate === "number" ? rawDate : new Date(rawDate).getTime() || Date.now();
          return {
            id: d.id,
            userId: data.userId || currentUser.uid,
            fromUserId: data.fromUserId || "",
            fromUserName: data.fromUserName || data.title || "User",
            fromUserUsername: data.fromUserUsername || data.fromUserName || "member",
            fromUserAvatar: data.fromUserAvatar || "",
            type: data.type || "system",
            title: data.title || "",
            body: data.body || data.message || "interacted with your post.",
            mediaThumbnail: data.mediaThumbnail || "",
            targetId: data.targetId || "",
            createdAt: ts,
            read: Boolean(data.read || data.isRead),
            link: data.link || "",
          };
        });

        setNotifications(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubNews();
  }, [currentUser?.uid]);

  // If no real notifications yet, show account setup notification for logged-in user!
  const setupNotificationItem: NewsNotificationItem = {
    id: "setup_account_notif",
    userId: currentUser?.uid || "me",
    fromUserId: "system_newshub",
    fromUserName: "News Hub Team",
    fromUserUsername: "News Hub",
    fromUserAvatar: "",
    type: "system",
    title: "Account Setup",
    body: "setup your account profile to customize your bio, avatar, and social links.",
    link: "/news-hub/profile/edit",
    createdAt: Date.now(),
  };

  const displayedNotifications =
    notifications.length > 0
      ? notifications
      : currentUser
      ? [setupNotificationItem]
      : [];

  // Group notifications into New, Yesterday, Last 7 days, Earlier
  const groupedNotifications = React.useMemo(() => {
    const map = new Map<string, NewsNotificationItem[]>();
    map.set("New", []);
    map.set("Yesterday", []);
    map.set("Last 7 days", []);
    map.set("Earlier", []);

    displayedNotifications.forEach((item) => {
      const g = getTimeGroup(item.createdAt);
      const arr = map.get(g) || [];
      arr.push(item);
      map.set(g, arr);
    });

    return map;
  }, [displayedNotifications]);

  const handleToggleFollow = async (e: React.MouseEvent, item: NewsNotificationItem) => {
    e.stopPropagation();
    triggerHaptic();

    if (!currentUser?.uid) {
      notify("Please sign in to follow creators!", "error");
      navigate("/signin");
      return;
    }

    const isF = followedIds.includes(item.fromUserId);
    const targetName = item.fromUserName || item.fromUserUsername || "Creator";

    const res = await toggleFollowUser({
      targetUid: item.fromUserId,
      targetName,
      currentUser,
      currentlyFollowing: isF,
    });

    if (res.ok) {
      notify(res.isFollowing ? `Following @${item.fromUserUsername}` : `Unfollowed @${item.fromUserUsername}`, res.isFollowing ? "success" : "info");
    }
  };

  const handleNotificationClick = (item: NewsNotificationItem) => {
    triggerHaptic();
    if (item.link) {
      navigate(item.link);
    } else if (item.fromUserId && item.fromUserId !== "system_newshub") {
      navigate(`/news-hub/profile/${item.fromUserId}`);
    } else {
      navigate("/news-hub/profile/edit");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-28">
      <SEO title="Notifications — News Hub" description="Stay updated on new followers, likes, comments, and story replies." />

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 w-full bg-[#F8FAFC]/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/news-hub");
            }}
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 shadow-2xs flex items-center justify-center text-slate-800 dark:text-zinc-200 cursor-pointer active:scale-95 transition"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Notifications
          </h1>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setShowPreferencesModal(true);
            }}
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 shadow-2xs flex items-center justify-center text-slate-800 dark:text-zinc-200 cursor-pointer active:scale-95 transition"
            aria-label="Settings"
            title="Notification settings"
          >
            <Settings className="w-4.5 h-4.5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Loading notifications...</p>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[28px] p-6 shadow-sm border border-slate-200/70 dark:border-zinc-800">
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1">Interactions with your posts and followers will appear here.</p>
          </div>
        ) : (
          Array.from(groupedNotifications.entries()).map(([groupTitle, items]) => {
            if (items.length === 0) return null;

            return (
              <section
                key={groupTitle}
                className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-200/70 dark:border-zinc-800 space-y-4"
              >
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {groupTitle}
                </h2>

                <div className="space-y-4">
                  {items.map((item) => {
                    const username = item.fromUserUsername || item.fromUserName || "user";
                    const isFollowType = item.type === "follow";
                    const isFollowingUser = followedIds.includes(item.fromUserId);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        {/* Avatar */}
                        <ProfileAvatar
                          src={item.fromUserAvatar}
                          name={username}
                          className="w-11 h-11 ring-2 ring-slate-100 dark:ring-zinc-800"
                          iconClassName="w-5 h-5"
                        />

                        {/* Text Center */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-slate-900 dark:text-zinc-100 leading-snug">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {username}
                            </span>{" "}
                            <span className="text-slate-600 dark:text-zinc-300">
                              {item.body}
                            </span>{" "}
                            <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] whitespace-nowrap">
                              {formatCompactTimeAgo(item.createdAt)}
                            </span>
                          </p>
                        </div>

                        {/* Right Action Element */}
                        <div className="shrink-0">
                          {isFollowType ? (
                            isFollowingUser ? (
                              <button
                                type="button"
                                onClick={(e) => handleToggleFollow(e, item)}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
                              >
                                Following
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleToggleFollow(e, item)}
                                className="px-4.5 py-1.5 rounded-xl bg-[#1877F2] hover:bg-[#1465D8] text-white text-xs font-bold shadow-sm transition cursor-pointer"
                              >
                                Follow
                              </button>
                            )
                          ) : item.mediaThumbnail ? (
                            <img
                              src={item.mediaThumbnail}
                              alt=""
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 dark:border-zinc-700 shadow-2xs group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 flex items-center justify-center text-[#1877F2]">
                              <MessageSquare className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Get notified about important stuff
              </h2>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              We'll notify you when
            </p>

            <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-700/50 space-y-3">
              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4.5 h-4.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Your comments or evidence get replied to
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.comments}
                  onChange={(e) => setPrefs({ ...prefs, comments: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877F2] focus:ring-[#1877F2]"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    You receive Stars or creator sponsorship
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.stars}
                  onChange={(e) => setPrefs({ ...prefs, stars: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877F2] focus:ring-[#1877F2]"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4.5 h-4.5 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Someone follows your profile or posts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.follows}
                  onChange={(e) => setPrefs({ ...prefs, follows: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877F2] focus:ring-[#1877F2]"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Critical scam alerts in your tagged category
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.scamAlerts}
                  onChange={(e) => setPrefs({ ...prefs, scamAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877F2] focus:ring-[#1877F2]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowPreferencesModal(false);
                  notify("Notification preferences updated!", "success");
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold bg-[#1877F2] hover:bg-[#1465D8] text-white transition cursor-pointer shadow-sm"
              >
                Get notified
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsHubNotifications;
