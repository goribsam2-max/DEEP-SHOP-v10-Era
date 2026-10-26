import { useEffect, useState } from "react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { hasImmediateAdminOrStaffRole } from "./admin";
import { getSafeDisplayName, getSafePublicUsername } from "./utils";

const LOCAL_FOLLOW_KEY = "followed_creators";

export function getLocalFollowedIds(uid?: string | null): string[] {
  try {
    const scopedKey = uid ? `${LOCAL_FOLLOW_KEY}_${uid}` : LOCAL_FOLLOW_KEY;
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
    const legacyRaw = localStorage.getItem(LOCAL_FOLLOW_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch {}
  return [];
}

function saveLocalFollowedIds(ids: string[], uid?: string | null) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  try {
    localStorage.setItem(LOCAL_FOLLOW_KEY, JSON.stringify(unique));
    if (uid) {
      localStorage.setItem(`${LOCAL_FOLLOW_KEY}_${uid}`, JSON.stringify(unique));
    }
    window.dispatchEvent(new CustomEvent("followStateUpdated", { detail: { ids: unique } }));
  } catch {}
}

export interface FollowerStatsSnapshot {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followerIds: string[];
}

export function getEffectiveFollowersCount(
  userData: Record<string, any> | null | undefined,
  realFollowerCount?: number
): number {
  const rawStoredLen = Array.isArray(userData?.followers)
    ? userData!.followers.filter(Boolean).length
    : 0;
  const realCount =
    typeof realFollowerCount === "number" ? realFollowerCount : rawStoredLen;

  if (
    typeof userData?.followersOffset === "number" &&
    !Number.isNaN(userData.followersOffset)
  ) {
    return Math.max(0, realCount + Math.trunc(userData.followersOffset));
  }

  const storedMaxCount = Math.max(
    Number(userData?.followersCount || 0),
    Number(userData?.customFollowersCount || 0)
  );
  const legacyOffset = Math.max(0, storedMaxCount - rawStoredLen);
  return Math.max(0, legacyOffset + realCount);
}

function computeStats(
  targetUid: string,
  targetData: Record<string, any> | null,
  queriedFollowerIds: string[],
  currentUid: string | null | undefined,
  currentUserFollowing: string[] | null
): FollowerStatsSnapshot {
  const rawStoredFollowers: string[] = Array.isArray(targetData?.followers)
    ? targetData.followers.filter(Boolean)
    : [];

  const localFollowed = currentUid ? getLocalFollowedIds(currentUid) : [];
  const hasCurrentFollowingSource = Array.isArray(currentUserFollowing);

  const isFollowing = Boolean(
    currentUid &&
      currentUid !== targetUid &&
      (hasCurrentFollowingSource
        ? currentUserFollowing!.includes(targetUid)
        : queriedFollowerIds.includes(currentUid) ||
          rawStoredFollowers.includes(currentUid) ||
          localFollowed.includes(targetUid))
  );

  // Merge stored followers + live queried followers (`users` where `following` array-contains `targetUid`)
  const mergedSet = new Set<string>();
  rawStoredFollowers.forEach((fId) => {
    if (fId === targetUid) return;
    // If currentUid unfollowed, do not count stale entry from targetData.followers
    if (currentUid && fId === currentUid && !isFollowing) return;
    mergedSet.add(fId);
  });
  queriedFollowerIds.forEach((fId) => {
    if (fId === targetUid) return;
    if (currentUid && fId === currentUid && !isFollowing) return;
    mergedSet.add(fId);
  });
  if (currentUid && currentUid !== targetUid && isFollowing) {
    mergedSet.add(currentUid);
  }

  const followersCount = getEffectiveFollowersCount(targetData, mergedSet.size);

  const followingArr: string[] = Array.isArray(targetData?.following)
    ? targetData.following.filter((id: string) => Boolean(id) && id !== targetUid)
    : [];

  return {
    followersCount,
    followingCount: followingArr.length,
    isFollowing,
    followerIds: Array.from(mergedSet),
  };
}

/**
 * Real-time subscription to a user's true follower count, following count, and current user's follow state.
 * Works reliably even when cross-user writes on `users/{targetUid}` are restricted by Firestore rules,
 * because every user writes `following` on their own `users/{currentUid}` doc and `users` is publicly readable.
 */
export function subscribeToFollowerStats(
  targetUid: string | undefined | null,
  currentUid: string | undefined | null,
  onUpdate: (stats: FollowerStatsSnapshot) => void
): () => void {
  if (!targetUid || targetUid === "member_local" || targetUid === "author_demo") {
    const localIds = getLocalFollowedIds(currentUid);
    const isF = Boolean(targetUid && localIds.includes(targetUid));
    onUpdate({
      followersCount: isF ? 1 : 0,
      followingCount: 0,
      isFollowing: isF,
      followerIds: isF && currentUid ? [currentUid] : [],
    });
    return () => {};
  }

  let targetData: Record<string, any> | null = null;
  let queriedFollowerIds: string[] = [];
  let currentUserFollowing: string[] | null = null;
  let syncedOwnDocCount: number | null = null;

  const emit = () => {
    const stats = computeStats(
      targetUid,
      targetData,
      queriedFollowerIds,
      currentUid,
      currentUserFollowing
    );
    onUpdate(stats);

    // Self-heal own user document when viewing own profile/dashboard so stored fields stay in sync
    if (
      currentUid &&
      currentUid === targetUid &&
      targetData &&
      syncedOwnDocCount !== stats.followersCount
    ) {
      const currentStoredCount = Number(targetData.followersCount ?? -1);
      const currentStoredLen = Array.isArray(targetData.followers)
        ? targetData.followers.length
        : -1;
      if (
        currentStoredCount !== stats.followersCount ||
        currentStoredLen !== stats.followerIds.length
      ) {
        syncedOwnDocCount = stats.followersCount;
        setDoc(
          doc(db, "users", targetUid),
          {
            followers: stats.followerIds,
            followersCount: stats.followersCount,
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  };

  const unsubTarget = onSnapshot(
    doc(db, "users", targetUid),
    (snap) => {
      targetData = snap.exists() ? snap.data() : null;
      emit();
    },
    () => {
      emit();
    }
  );

  const qFollowers = query(
    collection(db, "users"),
    where("following", "array-contains", targetUid)
  );
  const unsubQuery = onSnapshot(
    qFollowers,
    (snap) => {
      queriedFollowerIds = snap.docs.map((d) => d.id);
      emit();
    },
    () => {
      emit();
    }
  );

  let unsubCurrent: (() => void) | null = null;
  if (currentUid && currentUid !== targetUid) {
    unsubCurrent = onSnapshot(
      doc(db, "users", currentUid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const fList: string[] = Array.isArray(d?.following)
            ? d.following.filter(Boolean)
            : [];
          currentUserFollowing = fList;
          saveLocalFollowedIds(fList, currentUid);
        } else {
          currentUserFollowing = getLocalFollowedIds(currentUid);
        }
        emit();
      },
      () => {
        currentUserFollowing = getLocalFollowedIds(currentUid);
        emit();
      }
    );
  }

  return () => {
    unsubTarget();
    unsubQuery();
    if (unsubCurrent) unsubCurrent();
  };
}

export interface ToggleFollowOptions {
  targetUid: string;
  targetName?: string;
  currentUser: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    username?: string | null;
    handle?: string | null;
  } | null;
  currentlyFollowing?: boolean;
}

export async function toggleFollowUser({
  targetUid,
  targetName,
  currentUser,
  currentlyFollowing,
}: ToggleFollowOptions): Promise<{
  ok: boolean;
  isFollowing: boolean;
  followersCount?: number;
  reason?: "unauthenticated" | "self" | "invalid";
}> {
  if (!currentUser?.uid) {
    return { ok: false, isFollowing: false, reason: "unauthenticated" };
  }
  if (!targetUid) {
    return { ok: false, isFollowing: false, reason: "invalid" };
  }
  if (currentUser.uid === targetUid) {
    return { ok: false, isFollowing: false, reason: "self" };
  }

  const myUid = currentUser.uid;
  const localIds = getLocalFollowedIds(myUid);
  const prevFollowing =
    typeof currentlyFollowing === "boolean"
      ? currentlyFollowing
      : localIds.includes(targetUid);
  const nextFollowing = !prevFollowing;

  const nextLocal = nextFollowing
    ? Array.from(new Set([...localIds, targetUid]))
    : localIds.filter((id) => id !== targetUid);
  saveLocalFollowedIds(nextLocal, myUid);

  if (targetUid === "member_local" || targetUid === "author_demo") {
    return { ok: true, isFollowing: nextFollowing, followersCount: nextFollowing ? 1 : 0 };
  }

  // 1. Always persist `following` on the signed-in user's OWN document (guaranteed owner permission)
  try {
    await setDoc(
      doc(db, "users", myUid),
      {
        following: nextFollowing ? arrayUnion(targetUid) : arrayRemove(targetUid),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not update own following array:", err);
  }

  // 2. Compute accurate new follower count and attempt direct update on target user's document
  let computedCount: number | undefined = undefined;
  try {
    const [targetSnap, followersQuerySnap] = await Promise.all([
      getDoc(doc(db, "users", targetUid)),
      getDocs(
        query(collection(db, "users"), where("following", "array-contains", targetUid))
      ),
    ]);
    const tData = targetSnap.exists() ? targetSnap.data() : null;
    const qIds = followersQuerySnap.docs.map((d) => d.id);
    const stats = computeStats(
      targetUid,
      tData,
      qIds,
      myUid,
      nextFollowing ? [targetUid] : []
    );
    computedCount = stats.followersCount;

    try {
      await updateDoc(doc(db, "users", targetUid), {
        followers: nextFollowing ? arrayUnion(myUid) : arrayRemove(myUid),
        followersCount: stats.followersCount,
      });
    } catch {
      // Cross-user write may be restricted for non-admin accounts; `subscribeToFollowerStats`
      // still reads real-time counts via the `following` array-contains query!
    }

    if (nextFollowing) {
      const isActorAdmin = hasImmediateAdminOrStaffRole(null, currentUser as any);
      if (isActorAdmin) {
        const totalNow = Math.max(1, computedCount || 1);
        setDoc(
          doc(db, "news_hub_notifications", `milestone_followers_${targetUid}`),
          {
            userId: targetUid,
            fromUserId: "system_milestone",
            fromUserName: "Congratulations! 🎉",
            fromUserUsername: "",
            fromUserAvatar: "",
            type: "milestone",
            title: "Congratulations! 🎉",
            body: `You now have ${totalNow.toLocaleString()} total followers! Keep growing your community.`,
            targetId: targetUid,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/news-hub/profile/${targetUid}`,
          },
          { merge: true }
        ).catch(() => {});
      } else {
        const followerLabel = getSafeDisplayName(currentUser, "Someone");
        const followerUsername = getSafePublicUsername(currentUser);

        const notifPayload = {
          userId: targetUid,
          fromUserId: myUid,
          fromUserName: followerLabel,
          fromUserUsername: followerUsername,
          fromUserAvatar: currentUser.photoURL || "",
          type: "follow",
          title: "New Follower",
          body: "started following you.",
          targetId: myUid,
          isRead: false,
          read: false,
          createdAt: Date.now(),
          link: `/news-hub/profile/${myUid}`,
        };

        addDoc(collection(db, "news_hub_notifications"), notifPayload).catch(() => {});
        addDoc(collection(db, "notifications"), notifPayload).catch(() => {});
      }
    }
  } catch {}

  return {
    ok: true,
    isFollowing: nextFollowing,
    followersCount: computedCount,
  };
}

/**
 * Hook that keeps a reactive list of creator/user IDs followed by `currentUid`.
 */
export function useFollowedIds(currentUid?: string | null): string[] {
  const [ids, setIds] = useState<string[]>(() => getLocalFollowedIds(currentUid));

  useEffect(() => {
    setIds(getLocalFollowedIds(currentUid));

    const handleLocalEvent = () => {
      setIds(getLocalFollowedIds(currentUid));
    };
    window.addEventListener("followStateUpdated", handleLocalEvent);

    let unsubFirestore: (() => void) | null = null;
    if (currentUid) {
      unsubFirestore = onSnapshot(
        doc(db, "users", currentUid),
        (snap) => {
          if (snap.exists()) {
            const arr: string[] = Array.isArray(snap.data()?.following)
              ? snap.data().following.filter(Boolean)
              : [];
            saveLocalFollowedIds(arr, currentUid);
            setIds(arr);
          }
        },
        () => {}
      );
    }

    return () => {
      window.removeEventListener("followStateUpdated", handleLocalEvent);
      if (unsubFirestore) unsubFirestore();
    };
  }, [currentUid]);

  return ids;
}
