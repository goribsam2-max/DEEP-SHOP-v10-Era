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
    'User';

  const avatarUrl =
    otherUser?.photoURL ||
    otherUser?.avatar ||
    otherUser?.image;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center select-none font-inter">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-2xl font-bold text-[#2F80ED]">
            {(displayName || 'U')[0].toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="text-[18px] font-bold text-zinc-950 dark:text-white tracking-tight">
        {displayName}
      </h3>

      <p className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-1">
        Send a message to start the conversation
      </p>

      {(otherUser?.id || otherUser?.uid) && (
        <button
          type="button"
          onClick={() => navigate(`/store/${otherUser.id || otherUser.uid}`)}
          className="mt-4 px-5 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] text-zinc-900 dark:text-zinc-100 font-medium text-xs transition-all active:scale-95 cursor-pointer"
        >
          View profile
        </button>
      )}
    </div>
  );
};
