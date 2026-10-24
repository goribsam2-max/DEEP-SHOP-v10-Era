import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  fallbackText?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  custom: '',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = 'User avatar',
  className = '',
  size = 'md',
  fallbackText,
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const hasValidSrc = Boolean(src && typeof src === 'string' && src.trim().length > 0 && !src.includes('undefined') && !src.includes('null'));

  if (hasValidSrc) {
    return (
      <img
        src={src!}
        alt={alt}
        className={`rounded-full object-cover border border-slate-200 dark:border-zinc-800 ${sizeClass} ${className}`}
        onError={(e) => {
          // If image fails to load, hide image and display fallback icon by replacing parent inner HTML
          const parent = e.currentTarget.parentElement;
          if (parent) {
            e.currentTarget.style.display = 'none';
            const icon = document.createElement('div');
            icon.className = `rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30 ${sizeClass} ${className}`;
            icon.innerHTML = `<svg class="w-1/2 h-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            parent.appendChild(icon);
          }
        }}
      />
    );
  }

  // Fallback SVG icon or initial letter fallback
  return (
    <div
      className={`rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center font-bold border border-slate-200 dark:border-zinc-700/60 flex-shrink-0 ${sizeClass} ${className}`}
    >
      {fallbackText ? (
        <span>{fallbackText.slice(0, 2).toUpperCase()}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-slate-400 dark:text-zinc-400" />
      )}
    </div>
  );
};

export default UserAvatar;
