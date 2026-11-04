import React from 'react';

export const VerifiedLoopBadge: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4 text-[#0095F6] fill-[#0095F6] shrink-0',
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
};

export default VerifiedLoopBadge;
