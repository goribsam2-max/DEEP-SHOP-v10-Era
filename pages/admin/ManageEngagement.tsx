import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import {
  Search,
  Heart,
  Share2,
  Eye,
  User,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ThumbsUp,
  Smile,
  Sparkles,
  FileText,
} from "lucide-react";
import {
  formatCompactNumber,
  getSafePublicUsername,
  getSafeDisplayName,
} from "../../lib/utils";

const toTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sumPostReactions = (item: any): number => {
  if (item?.reactionsCount && typeof item.reactionsCount === "object") {
    return (Object.values(item.reactionsCount) as any[]).reduce(
      (acc: number, v: any) => acc + (typeof v === "number" ? v : Number(v) || 0),
      0
    );
  }
  return Number(item?.votes || 0);
};

export const ManageEngagement: React.FC = () => {
  const notify = useNotify();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"post" | "user">("post");
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const loadPostsAndUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [postsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "scam_posts")),
        getDocs(collection(db, "users")),
      ]);

      const postsList = postsSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          type: "post" as const,
        }))
        .sort(
          (a: any, b: any) =>
            toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt)
        );

      const usersList = usersSnap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          type: "user" as const,
        }))
        .sort(
          (a: any, b: any) =>
            toTimestampMs(b.createdAt || b.registrationDate || b.updatedAt) -
            toTimestampMs(a.createdAt || a.registrationDate || a.updatedAt)
        );

      setAllPosts(postsList);
      setAllUsers(usersList);
    } catch (err) {
      console.error("Failed to load engagement items:", err);
      notify("Could not load posts and users. Please try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadPostsAndUsers();
  }, [loadPostsAndUsers]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (searchType === "post") {
      if (!q) return allPosts;
      return allPosts.filter((p: any) => {
        const idMatch = String(p.id || "").toLowerCase().includes(q);
        const titleMatch = String(p.title || "").toLowerCase().includes(q);
        const descMatch = String(p.description || "").toLowerCase().includes(q);
        const reporterMatch = String(p.reporterName || "")
          .toLowerCase()
          .includes(q);
        const scammerMatch = String(p.scammerName || "")
          .toLowerCase()
          .includes(q);
        return (
          idMatch || titleMatch || descMatch || reporterMatch || scammerMatch
        );
      });
    } else {
      if (!q) return allUsers;
      return allUsers.filter((u: any) => {
        const idMatch = String(u.id || u.uid || "").toLowerCase().includes(q);
        const nameMatch = String(u.displayName || "")
          .toLowerCase()
          .includes(q);
        const shopMatch = String(u.shopName || "").toLowerCase().includes(q);
        const safeUser = getSafePublicUsername(u).toLowerCase();
        const userMatch = safeUser ? safeUser.includes(q.replace(/^@/, "")) : false;
        const emailMatch = String(u.email || "").toLowerCase().includes(q);
        return idMatch || nameMatch || shopMatch || userMatch || emailMatch;
      });
    }
  }, [searchType, searchTerm, allPosts, allUsers]);

  const adjustPostMetric = async (
    postId: string,
    field:
      | "views"
      | "repostsCount"
      | "love"
      | "like"
      | "haha"
      | "wow"
      | "sad"
      | "angry",
    delta: number
  ) => {
    if (!delta) return;
    const target =
      (selectedItem?.id === postId ? selectedItem : null) ||
      allPosts.find((p) => p.id === postId);
    if (!target) return;

    const isReaction = !["views", "repostsCount"].includes(field);
    const ref = doc(db, "scam_posts", postId);

    try {
      if (isReaction) {
        const existingReactionsCount =
          target.reactionsCount && typeof target.reactionsCount === "object"
            ? { ...target.reactionsCount }
            : {};
        const prevVal = Number(existingReactionsCount[field] || 0);
        const nextVal = Math.max(0, prevVal + delta);
        const nextReactionsCount = {
          ...existingReactionsCount,
          [field]: nextVal,
        };
        const nextVotes = Object.values(nextReactionsCount).reduce(
          (acc: number, v: any) => acc + (Number(v) || 0),
          0
        );

        await setDoc(
          ref,
          {
            reactionsCount: nextReactionsCount,
            votes: nextVotes,
          },
          { merge: true }
        );

        const applyUpdate = (item: any) =>
          item.id === postId
            ? {
                ...item,
                reactionsCount: nextReactionsCount,
                votes: nextVotes,
              }
            : item;

        setAllPosts((prev) => prev.map(applyUpdate));
        setSelectedItem((prev: any) => (prev ? applyUpdate(prev) : null));
        notify(`Reaction (${field}) updated`, "success");
      } else {
        const prevVal = Number(target[field] || 0);
        const nextVal = Math.max(0, prevVal + delta);

        await setDoc(
          ref,
          {
            [field]: nextVal,
          },
          { merge: true }
        );

        const applyUpdate = (item: any) =>
          item.id === postId ? { ...item, [field]: nextVal } : item;

        setAllPosts((prev) => prev.map(applyUpdate));
        setSelectedItem((prev: any) => (prev ? applyUpdate(prev) : null));
        notify(
          `${field === "views" ? "Post views" : "Reposts"} updated`,
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to update post metric:", err);
      notify("Update failed", "error");
    }
  };

  const adjustUserMetric = async (
    userId: string,
    field: "views" | "followersCount",
    delta: number
  ) => {
    if (!delta) return;
    const target =
      (selectedItem?.id === userId ? selectedItem : null) ||
      allUsers.find((u) => u.id === userId);
    if (!target) return;

    const currentBase =
      field === "followersCount"
        ? Math.max(
            Number(target.followersCount || 0),
            Array.isArray(target.followers) ? target.followers.length : 0
          )
        : Number(target.views || 0);

    const nextVal = Math.max(0, currentBase + delta);
    const ref = doc(db, "users", userId);

    try {
      await setDoc(
        ref,
        {
          [field]: nextVal,
        },
        { merge: true }
      );

      const applyUpdate = (item: any) =>
        item.id === userId ? { ...item, [field]: nextVal } : item;

      setAllUsers((prev) => prev.map(applyUpdate));
      setSelectedItem((prev: any) => (prev ? applyUpdate(prev) : null));
      notify(
        `${field === "views" ? "Profile views" : "Followers"} updated`,
        "success"
      );
    } catch (err) {
      console.error("Failed to update user metric:", err);
      notify("Update failed", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#1877F2]" />
            <span>Engagement Management</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            View all News Hub posts and users, and adjust reactions, reposts, post views, and profile metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-zinc-800 rounded-2xl p-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setSearchType("post");
                setSelectedItem(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                searchType === "post"
                  ? "bg-[#1877F2] text-white shadow-md"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Posts ({allPosts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("user");
                setSelectedItem(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                searchType === "user"
                  ? "bg-[#1877F2] text-white shadow-md"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Users ({allUsers.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadPostsAndUsers}
            disabled={loading}
            className="h-10 px-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Listing Section */}
      {!selectedItem && (
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchType === "post"
                    ? "Search posts by ID, title, caption, or author..."
                    : "Search users by name, username, shop, or UID..."
                }
                className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-[#1877F2] outline-none transition"
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-2xl font-bold text-xs transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1877F2]" />
              <p className="text-sm font-semibold">
                Loading {searchType === "post" ? "posts" : "users"}...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                No {searchType === "post" ? "posts" : "users"} found
              </p>
              <p className="text-xs text-zinc-400">
                {searchTerm
                  ? "Try clearing or changing your search keyword."
                  : `There are currently no ${searchType === "post" ? "posts" : "users"} in the database.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                if (item.type === "post") {
                  const thumb =
                    (Array.isArray(item.images) && item.images[0]) ||
                    item.reporterAvatar ||
                    "";
                  const postHeadline =
                    item.title?.trim() ||
                    item.description?.trim() ||
                    "Untitled Post";
                  const totalReacts = sumPostReactions(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="flex flex-col justify-between gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-[#1877F2]/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-left group cursor-pointer"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug">
                            {postHeadline}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
                            By {item.reporterName || "Community Member"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#1877F2] shrink-0 mt-1 transition-colors" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          {formatCompactNumber(item.views || 0)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          {formatCompactNumber(totalReacts)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                          {formatCompactNumber(item.repostsCount || 0)}
                        </span>
                      </div>
                    </button>
                  );
                }

                const userDisplayName = getSafeDisplayName(item, "User");
                const safeUsername = getSafePublicUsername(item);
                const userAvatar =
                  item.photoURL || item.shopLogo || item.avatar || "";
                const userFollowers = Math.max(
                  Number(item.followersCount || 0),
                  Array.isArray(item.followers) ? item.followers.length : 0
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex flex-col justify-between gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-[#1877F2]/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userDisplayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {userDisplayName}
                        </p>
                        {safeUsername ? (
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                            @{safeUsername}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 truncate">
                            ID: {item.id.slice(0, 12)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#1877F2] shrink-0 transition-colors" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[#1877F2]" />
                        {formatCompactNumber(item.views || 0)} views
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {formatCompactNumber(userFollowers)} followers
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Item Adjustment Controls */}
      {selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="flex items-center gap-2 text-sm font-bold text-[#1877F2] hover:underline cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to {selectedItem.type === "post" ? "posts" : "users"}</span>
            </button>

            <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-3">
              {selectedItem.type === "post" ? (
                <>
                  {Array.isArray(selectedItem.images) &&
                    selectedItem.images[0] && (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3">
                        <img
                          src={selectedItem.images[0]}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    {selectedItem.title || selectedItem.reporterName || "Feed Post"}
                  </h3>
                  {selectedItem.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-4 leading-relaxed text-left bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl">
                      {selectedItem.description}
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    Author: {selectedItem.reporterName || "Member"} · ID:{" "}
                    {selectedItem.id}
                  </p>
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-around text-xs font-bold">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      Total Reactions:{" "}
                      <strong className="text-rose-500">
                        {formatCompactNumber(sumPostReactions(selectedItem))}
                      </strong>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mx-auto border-2 border-[#1877F2]/20 flex items-center justify-center">
                    {selectedItem.photoURL ||
                    selectedItem.shopLogo ||
                    selectedItem.avatar ? (
                      <img
                        src={
                          selectedItem.photoURL ||
                          selectedItem.shopLogo ||
                          selectedItem.avatar
                        }
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-zinc-400" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                    {getSafeDisplayName(selectedItem, "User")}
                  </h3>
                  {getSafePublicUsername(selectedItem) && (
                    <p className="text-xs font-semibold text-zinc-500">
                      @{getSafePublicUsername(selectedItem)}
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    UID: {selectedItem.id}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedItem.type === "post" ? (
              <>
                <MetricCard
                  title="Post Views"
                  value={Number(selectedItem.views || 0)}
                  icon={<Eye className="w-5 h-5 text-[#1877F2]" />}
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "views", delta)
                  }
                />
                <MetricCard
                  title="Reposts"
                  value={Number(selectedItem.repostsCount || 0)}
                  icon={<Share2 className="w-5 h-5 text-emerald-500" />}
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "repostsCount", delta)
                  }
                />
                <MetricCard
                  title="Love Reactions"
                  value={Number(selectedItem.reactionsCount?.love || 0)}
                  icon={<Heart className="w-5 h-5 text-rose-600 fill-current" />}
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "love", delta)
                  }
                />
                <MetricCard
                  title="Like Reactions"
                  value={Number(selectedItem.reactionsCount?.like || 0)}
                  icon={
                    <ThumbsUp className="w-5 h-5 text-[#1877F2] fill-current" />
                  }
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "like", delta)
                  }
                />
                <MetricCard
                  title="Haha Reactions"
                  value={Number(selectedItem.reactionsCount?.haha || 0)}
                  icon={<Smile className="w-5 h-5 text-amber-500" />}
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "haha", delta)
                  }
                />
                <MetricCard
                  title="Wow Reactions"
                  value={Number(selectedItem.reactionsCount?.wow || 0)}
                  icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "wow", delta)
                  }
                />
                <MetricCard
                  title="Sad Reactions"
                  value={Number(selectedItem.reactionsCount?.sad || 0)}
                  icon={
                    <svg
                      className="w-5 h-5 text-sky-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  }
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "sad", delta)
                  }
                />
                <MetricCard
                  title="Angry Reactions"
                  value={Number(selectedItem.reactionsCount?.angry || 0)}
                  icon={
                    <svg
                      className="w-5 h-5 text-orange-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                      <path d="M7.5 8 10 9" />
                      <path d="m14 9 2.5-1" />
                      <line x1="9" y1="10" x2="9.01" y2="10" />
                      <line x1="15" y1="10" x2="15.01" y2="10" />
                    </svg>
                  }
                  onAdjust={(delta) =>
                    adjustPostMetric(selectedItem.id, "angry", delta)
                  }
                />
              </>
            ) : (
              <>
                <MetricCard
                  title="Profile Views"
                  value={Number(selectedItem.views || 0)}
                  icon={<Eye className="w-5 h-5 text-[#1877F2]" />}
                  onAdjust={(delta) =>
                    adjustUserMetric(selectedItem.id, "views", delta)
                  }
                />
                <MetricCard
                  title="Followers"
                  value={Math.max(
                    Number(selectedItem.followersCount || 0),
                    Array.isArray(selectedItem.followers)
                      ? selectedItem.followers.length
                      : 0
                  )}
                  icon={<User className="w-5 h-5 text-emerald-500" />}
                  onAdjust={(delta) =>
                    adjustUserMetric(selectedItem.id, "followersCount", delta)
                  }
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onAdjust: (delta: number) => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  onAdjust,
}) => {
  const [inputVal, setInputVal] = useState("10");

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
              {title}
            </h4>
            <p className="text-[11px] text-zinc-400 tabular-nums">
              Exact: {value.toLocaleString()}
            </p>
          </div>
        </div>
        <span className="text-xl font-black text-[#1877F2] tabular-nums">
          {formatCompactNumber(value)}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="w-24 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1877F2]"
        />
        <button
          type="button"
          onClick={() => onAdjust(Math.abs(parseInt(inputVal, 10) || 0))}
          className="flex-1 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => onAdjust(-Math.abs(parseInt(inputVal, 10) || 0))}
          className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
        >
          - Subtract
        </button>
      </div>
    </div>
  );
};

export default ManageEngagement;
