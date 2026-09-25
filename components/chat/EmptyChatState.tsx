import React from 'react';
import { useNavigate } from 'react-router-dom';

interface EmptyChatStateProps {
  otherUser: any;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({ otherUser }) => {
  const navigate = useNavigate();

  const displayName =
    otherUser?.shopName ||
    otherUser?.displayName ||
    otherUser?.name ||
    'zebra.45691811';

  const avatarUrl =
    otherUser?.photoURL ||
    otherUser?.avatar ||
    otherUser?.image;

  const followersCount = otherUser?.followersCount || 0;
  const postsCount = otherUser?.productsCount || otherUser?.postsCount || 0;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none font-inter animate-fade-in">
      {/* Centered Large Avatar */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700/60 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shadow-sm mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg className="w-14 h-14 fill-current text-zinc-400 dark:text-zinc-500" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>

      {/* Bold Username */}
      <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
        {displayName}
      </h3>

      {/* Followers & Posts Count */}
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
        {followersCount} followers · {postsCount} posts
      </p>

      {/* Follows you / Status */}
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
        Follows you
      </p>

      {/* View profile button */}
      <button
        type="button"
        onClick={() => {
          if (otherUser?.id || otherUser?.uid) {
            navigate(`/store/${otherUser.id || otherUser.uid}`);
          }
        }}
        className="mt-4 px-6 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
      >
        View profile
      </button>
    </div>
  );
};
