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

  return (
    <div className="px-5 pt-2 pb-3.5 shrink-0">
      <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar py-0.5">
        {/* First Circle: Exact Dashed "+" Circle matching IMG_5359 top-left (returns to /messages on back/publish) */}
        <button
          type="button"
          onClick={() => navigate('/loops/create-story?from=messages', { state: { from: '/messages' } })}
          className="flex flex-col items-center shrink-0 w-[62px] group cursor-pointer focus:outline-none"
          title="Add story"
          aria-label="Add story"
        >
          <div className="w-[62px] h-[62px] rounded-full msg-story-add-ring flex items-center justify-center transition-transform group-active:scale-95">
            <MsgPlusIcon className="w-[22px] h-[22px]" />
          </div>
        </button>

        {/* Active Stories & Contacts */}
        {items.map((item) => {
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
              className="flex flex-col items-center shrink-0 w-[62px] group cursor-pointer focus:outline-none"
            >
              <div className="relative w-[62px] h-[62px] flex items-center justify-center transition-transform group-active:scale-95">
                <div
                  className={cn(
                    'w-full h-full rounded-full overflow-hidden flex items-center justify-center',
                    item.hasStory
                      ? 'p-[2px] bg-gradient-to-tr from-[#2F80ED] via-sky-500 to-indigo-500'
                      : 'ring-1 ring-black/[0.06] dark:ring-white/10'
                  )}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm font-bold text-[#2F80ED]">{initial}</span>
                    )}
                  </div>
                </div>
              </div>

              <span className="mt-2 text-[12.5px] font-medium text-zinc-800 dark:text-zinc-200 truncate w-full text-center leading-tight">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
