import React from 'react';

interface SvgProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/** Top-right Search magnifying glass (IMG_5359 left) */
export const MsgSearchIcon: React.FC<SvgProps> = ({ className = 'w-[22px] h-[22px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.2 16.2L20.5 20.5" />
  </svg>
);

/** Crisp thin "+" icon for Story Add circle, "+ New Chat" pill, and "+" reaction button (IMG_5359) */
export const MsgPlusIcon: React.FC<SvgProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

/** Three horizontal dots "..." next to "Chats" heading (IMG_5359 left) */
export const MsgDotsHorizontalIcon: React.FC<SvgProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <circle cx="5.5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18.5" cy="12" r="1.6" />
  </svg>
);

/** Double checkmark read receipt "✓✓" in chat rows (IMG_5359 left) */
export const MsgCheckDoubleIcon: React.FC<SvgProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M2.5 12.5l4.2 4.2L15.5 8" />
    <path d="M9.5 13.7l3 3L21.5 8" />
  </svg>
);

/** Exact rounded house outline with inner door arch (IMG_5359 bottom-left) */
export const MsgHomeIcon: React.FC<SvgProps> = ({ className = 'w-[24px] h-[24px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3.8 10.4L10.7 4.2a1.95 1.95 0 0 1 2.6 0l6.9 6.2c.5.45.8 1.1.8 1.78V18.8A2.2 2.2 0 0 1 18.8 21H5.2A2.2 2.2 0 0 1 3 18.8v-6.62c0-.68.3-1.33.8-1.78Z" />
    <path d="M9.5 21v-5.2a2.5 2.5 0 0 1 5 0V21" />
  </svg>
);

/** Exact minimal person head + open curved shoulders outline (IMG_5359 bottom-right) */
export const MsgUserIcon: React.FC<SvgProps> = ({ className = 'w-[24px] h-[24px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5.5 19.6c.55-3.2 3.15-5.1 6.5-5.1s5.95 1.9 6.5 5.1" />
  </svg>
);

/** Compact "<" back chevron in Active Chat header (IMG_5359 top-right screen) */
export const MsgBackChevronIcon: React.FC<SvgProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14.5 6.5L9 12l5.5 5.5" />
  </svg>
);

/** Exact Video Call camcorder icon (IMG_5359 Active Chat top-right) */
export const MsgVideoCallIcon: React.FC<SvgProps> = ({ className = 'w-[22px] h-[22px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="2.5" y="6.2" width="13.2" height="11.6" rx="3" />
    <path d="M15.7 10.3l4.6-2.5c.65-.35 1.45.12 1.45.86v6.68c0 .74-.8 1.21-1.45.86l-4.6-2.5" />
  </svg>
);

/** Exact Voice Call handset icon (IMG_5359 Active Chat top-right) */
export const MsgPhoneCallIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M20.8 16.5v2.4a1.8 1.8 0 0 1-1.96 1.8 17.8 17.8 0 0 1-7.77-2.76 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 2.9 4.74 1.8 1.8 0 0 1 4.69 2.8h2.42a1.8 1.8 0 0 1 1.8 1.54c.11.86.32 1.7.62 2.51a1.8 1.8 0 0 1-.4 1.9l-1.02 1.02a14.4 14.4 0 0 0 5.4 5.4l1.02-1.02a1.8 1.8 0 0 1 1.9-.4c.81.3 1.65.51 2.51.62a1.8 1.8 0 0 1 1.56 1.83Z" />
  </svg>
);

/** Exact Copy overlapping rectangles icon (IMG_5359 Hold Popup) */
export const MsgCopyIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="8.5" y="7.5" width="11" height="12.5" rx="2.4" />
    <path d="M5.5 15.5V6.4A2.4 2.4 0 0 1 7.9 4h7.6" />
  </svg>
);

/** Exact Reply left curved arrow icon (IMG_5359 Hold Popup) */
export const MsgReplyIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M9.5 6.5L5.5 10.5l4 4" />
    <path d="M5.8 10.5h8.7a4.2 4.2 0 0 1 0 8.4H9.5" />
  </svg>
);

/** Exact Forward right curved arrow icon (IMG_5359 Hold Popup) */
export const MsgForwardIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14.5 6.5l4 4-4 4" />
    <path d="M18.2 10.5H9.5a4.2 4.2 0 0 0 0 8.4h5" />
  </svg>
);

/** Exact Minimal Trash Bin icon without inner stripes (IMG_5359 Hold Popup) */
export const MsgTrashIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5.2c0-.66.54-1.2 1.2-1.2h2.6c.66 0 1.2.54 1.2 1.2V7" />
    <path d="M6.8 7l.75 11.1A2.1 2.1 0 0 0 9.65 20h4.7a2.1 2.1 0 0 0 2.1-1.9L17.2 7" />
  </svg>
);

/** Clean Community / People outline icon (IMG_5360 New Community & Desktop Rail) */
export const MsgCommunityIcon: React.FC<SvgProps> = ({ className = 'w-[22px] h-[22px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="9.2" cy="8.2" r="3.2" />
    <path d="M3.5 19c.5-2.8 2.7-4.5 5.7-4.5s5.2 1.7 5.7 4.5" />
    <path d="M15.6 5.5a3 3 0 0 1 0 5.6" />
    <path d="M17.2 14.8c1.9.4 3.3 1.7 3.7 3.9" />
  </svg>
);

/** Clean Chat Bubble outline icon (Desktop Rail) */
export const MsgChatBubbleIcon: React.FC<SvgProps> = ({ className = 'w-[21px] h-[21px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

/** Clean Settings Gear outline icon (Desktop Rail) */
export const MsgSettingsIcon: React.FC<SvgProps> = ({ className = 'w-[20px] h-[20px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/** Clean Composer Send Paper-plane icon */
export const MsgSendIcon: React.FC<SvgProps> = ({ className = 'w-[18px] h-[18px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M21.5 3.5L10.8 14.2" />
    <path d="M21.5 3.5L14.5 21.5l-3.7-7.3-7.3-3.7L21.5 3.5Z" />
  </svg>
);

/** Clean Composer Microphone outline icon */
export const MsgMicIcon: React.FC<SvgProps> = ({ className = 'w-[19px] h-[19px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21" />
  </svg>
);

/** Clean Composer Photo / Gallery outline icon */
export const MsgImageIcon: React.FC<SvgProps> = ({ className = 'w-[19px] h-[19px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <circle cx="8.8" cy="8.8" r="1.5" />
    <path d="M20.5 15.2l-4.2-4.2a1.6 1.6 0 0 0-2.3 0L5.5 19.5" />
  </svg>
);

/** Clean Composer Camera outline icon */
export const MsgCameraIcon: React.FC<SvgProps> = ({ className = 'w-[19px] h-[19px]', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14.5 4h-5L7.5 6.5H4.8A2.3 2.3 0 0 0 2.5 8.8v8.9A2.3 2.3 0 0 0 4.8 20h14.4a2.3 2.3 0 0 0 2.3-2.3V8.8a2.3 2.3 0 0 0-2.3-2.3h-2.7L14.5 4Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

/** Clean X Close icon */
export const MsgCloseIcon: React.FC<SvgProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);
