import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { hasImmediateAdminOrStaffRole } from '../../lib/admin';
import { cn } from '../../lib/utils';
import { MsgPlusIcon } from './MessagesSvgIcons';

export interface StoryOrContactItem {
  key: string;
  userId: string;
  name: string;
  avatar: string;
  storyId?: string;
  hasStory: boolean;
  isOnline?: boolean;
  createdAtMs?: number;
}

interface MessagesStoriesStripProps {
  currentUser: any;
  contacts: Array<{
    id: string;
    uid?: string;
    displayName?: string;
    photoURL?: string;
    isOnline?: boolean;
  }>;
  onOpenChatWithUser: (user: { id: string; uid?: string; displayName?: string; photoURL?: string }) => void;
}

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export const MessagesStoriesStrip: React.FC<MessagesStoriesStripProps> = ({
  currentUser,
  contacts,
  onOpenChatWithUser,
}) => {
  const navigate = useNavigate();
  const [activeStories, setActiveStories] = useState<any[]>([]);

  useEffect(() => {
    let mainStories: any[] = [];
    let communityStories: any[] = [];

    const mapStoryDoc = (id: string, data: Record<string, any>) => {
      const rawLabel = data.userName || data.sellerName || data.displayName || 'User';
      const createdAtMs =
        typeof data.createdAtMs === 'number'
          ? data.createdAtMs
          : data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : data.createdAt
          ? new Date(data.createdAt).getTime() || 0
          : 0;

      const mediaFallback =
        data.type !== 'video' &&
        data.mediaType !== 'video' &&
        !/\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i.test(String(data.mediaUrl || ''))
          ? data.mediaUrl
          : '';

      return {
        id,
        userId: data.userId || data.sellerId || '',
        name: String(rawLabel).trim().split(/\s+/)[0] || 'User',
        avatar: data.userAvatar || data.sellerLogo || data.sellerAvatar || mediaFallback || '',
        isCloseFriends: Boolean(data.isCloseFriends),
        closeFriendIds: Array.isArray(data.closeFriendIds) ? data.closeFriendIds : [],
        isArchived: Boolean(data.isArchived),
        createdAtMs,
      };
    };

    const emitMerged = () => {
      const mergedMap = new Map<string, any>();
      mainStories.forEach((s) => mergedMap.set(s.id, s));
      communityStories.forEach((s) => mergedMap.set(s.id, s));

      try {
        const localStories = JSON.parse(localStorage.getItem('deep_news_stories_local') || '[]');
        if (Array.isArray(localStories)) {
          localStories.forEach((ls: any) => {
            if (ls?.id && !mergedMap.has(ls.id)) {
              mergedMap.set(ls.id, mapStoryDoc(ls.id, ls));
            }
          });
        }
      } catch {}

      const uid = currentUser?.uid || '';
      const isAdm = hasImmediateAdminOrStaffRole(null, currentUser);
      const nowMs = Date.now();

      const valid = Array.from(mergedMap.values())
        .filter((s) => {
          if (s.isArchived) return false;
          if (s.createdAtMs > 0 && nowMs - s.createdAtMs > STORY_TTL_MS) return false;
          if (s.isCloseFriends && s.closeFriendIds.length > 0) {
            return isAdm || s.userId === uid || s.closeFriendIds.includes(uid);
          }
          return true;
        })
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      setActiveStories(valid);
    };

    const unsubStories = onSnapshot(
      collection(db, 'stories'),
      (snap) => {
        mainStories = snap.docs.map((d) => mapStoryDoc(d.id, d.data()));
        emitMerged();
      },
      () => emitMerged()
    );

    const unsubCommunityStories = onSnapshot(
      collection(db, 'creator_videos'),
      (snap) => {
        communityStories = snap.docs
          .filter((d) => d.data()?.kind === 'news_story')
          .map((d) => mapStoryDoc(d.id, d.data()));
        emitMerged();
      },
      () => emitMerged()
    );

    return () => {
      unsubStories();
      unsubCommunityStories();
    };
  }, [currentUser?.uid]);

  const items = useMemo<StoryOrContactItem[]>(() => {
    const result: StoryOrContactItem[] = [];
    const seenUsers = new Set<string>();

    // 1. Real non-expired stories first (grouped by latest story per user)
    for (const st of activeStories) {
      const uid = st.userId || st.id;
      if (!uid || seenUsers.has(uid)) continue;
      seenUsers.add(uid);
      const matchingContact = contacts.find((c) => (c.id || c.uid) === uid);
      result.push({
        key: `story-${st.id}`,
        userId: uid,
        name: uid === currentUser?.uid ? 'You' : st.name || matchingContact?.displayName?.split(/\s+/)[0] || 'Story',
        avatar: st.avatar || matchingContact?.photoURL || currentUser?.photoURL || '',
        storyId: st.id,
        hasStory: true,
        isOnline: Boolean(matchingContact?.isOnline),
        createdAtMs: st.createdAtMs,
      });
    }

    // 2. Real chat contacts / saved contacts
    for (const c of contacts) {
      const uid = c.id || c.uid || '';
      if (!uid || uid === 'system' || uid === currentUser?.uid || String(uid).startsWith('demo_') || seenUsers.has(uid)) {
        continue;
      }
      seenUsers.add(uid);
      const firstName = String(c.displayName || 'Contact').trim().split(/\s+/)[0] || 'Contact';
      result.push({
        key: `contact-${uid}`,
        userId: uid,
        name: firstName,
        avatar: c.photoURL || '',
        hasStory: false,
        isOnline: Boolean(c.isOnline),
      });
    }

    return result.slice(0, 20);
  }, [activeStories, contacts, currentUser?.uid, currentUser?.photoURL]);

    // Split into other stories/contacts and currentUser
    const others = items.filter((item) => item.userId !== currentUser?.uid);
    const half = Math.ceil(others.length / 2);
    const leftOthers = others.slice(0, half);
    const rightOthers = others.slice(half);

    const currentUserAvatar =
      currentUser?.photoURL ||
      activeStories.find((s) => s.userId === currentUser?.uid)?.avatar ||
      '';
    const hasMyStory = activeStories.some((s) => s.userId === currentUser?.uid);
    const myStoryId = activeStories.find((s) => s.userId === currentUser?.uid)?.id;

    return (
      <div className="w-full pt-2 pb-4 shrink-0 flex items-center justify-between px-2 sm:px-4 max-w-full overflow-hidden">
        {/* Left Scrollable Flanking Stories */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center justify-end gap-3 sm:gap-4 pr-1 sm:pr-2">
          {leftOthers.map((item) => {
            const initial = (item.name || 'U')[0]?.toUpperCase() || 'U';
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.hasStory && item.storyId) {
                    navigate(`/loops/story/${item.storyId}?from=messages`, { state: { from: '/messages' } });
                  } else {
                    onOpenChatWithUser({
                      id: item.userId,
                      uid: item.userId,
                      displayName: item.name,
                      photoURL: item.avatar,
                    });
                  }
                }}
                className="flex flex-col items-center shrink-0 w-[58px] sm:w-[64px] group cursor-pointer focus:outline-none"
              >
                <div className="relative w-[56px] h-[56px] sm:w-[62px] sm:h-[62px] flex items-center justify-center transition-transform group-active:scale-95">
                  <div
                    className={cn(
                      'w-full h-full rounded-full overflow-hidden flex items-center justify-center p-[2.5px]',
                      item.hasStory
                        ? 'bg-gradient-to-tr from-[#FF007A] via-[#E100FF] to-[#7928CA]'
                        : 'bg-gradient-to-tr from-pink-400 to-rose-400 opacity-80'
                    )}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-800 p-[1.5px]">
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-pink-600">
                          {initial}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="mt-1.5 text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center leading-tight">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center FIXED Prominent User Avatar + Add Story (+) Pill matching IMG_5470 */}
        <div className="flex flex-col items-center shrink-0 mx-2 sm:mx-3 z-10">
          <button
            type="button"
            onClick={() => {
              if (hasMyStory && myStoryId) {
                navigate(`/loops/story/${myStoryId}?from=messages`, { state: { from: '/messages' } });
              } else {
                navigate('/loops/create-story?from=messages', { state: { from: '/messages' } });
              }
            }}
            className="relative w-[80px] h-[80px] sm:w-[88px] sm:h-[88px] flex items-center justify-center transition-transform active:scale-95 group cursor-pointer focus:outline-none"
            title={hasMyStory ? 'View your story' : 'Add Story'}
          >
            <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-tr from-[#FF7A00] via-[#FF007A] to-[#D300C5] flex items-center justify-center border border-white/20">
              <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-800 p-[2px]">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="Your avatar"
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white font-bold text-xl">
                    {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* "Add Story +" Pill Button matching IMG_5470 */}
          <button
            type="button"
            onClick={() => navigate('/loops/create-story?from=messages', { state: { from: '/messages' } })}
            className="mt-1 px-3.5 py-1 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[11.5px] font-bold flex items-center gap-1 border border-black/10 dark:border-white/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>Add Story</span>
            <span className="text-sm leading-none font-bold">+</span>
          </button>
        </div>

        {/* Right Scrollable Flanking Stories */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center justify-start gap-3 sm:gap-4 pl-1 sm:pl-2">
          {rightOthers.map((item) => {
            const initial = (item.name || 'U')[0]?.toUpperCase() || 'U';
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.hasStory && item.storyId) {
                    navigate(`/loops/story/${item.storyId}?from=messages`, { state: { from: '/messages' } });
                  } else {
                    onOpenChatWithUser({
                      id: item.userId,
                      uid: item.userId,
                      displayName: item.name,
                      photoURL: item.avatar,
                    });
                  }
                }}
                className="flex flex-col items-center shrink-0 w-[58px] sm:w-[64px] group cursor-pointer focus:outline-none"
              >
                <div className="relative w-[56px] h-[56px] sm:w-[62px] sm:h-[62px] flex items-center justify-center transition-transform group-active:scale-95">
                  <div
                    className={cn(
                      'w-full h-full rounded-full overflow-hidden flex items-center justify-center p-[2.5px]',
                      item.hasStory
                        ? 'bg-gradient-to-tr from-[#FF007A] via-[#E100FF] to-[#7928CA]'
                        : 'bg-gradient-to-tr from-pink-400 to-rose-400 opacity-80'
                    )}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-800 p-[1.5px]">
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-pink-600">
                          {initial}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="mt-1.5 text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center leading-tight">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
};
