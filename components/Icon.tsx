import React from 'react';
import * as LucideIcons from 'lucide-react';

export type IconName = string;

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  className?: string;
  solid?: boolean;
}

const formatNameToPascal = (str: string) => {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

const customIconMapping: Record<string, keyof typeof LucideIcons> = {
  'bars': 'Menu',
  'instagram': 'Camera',
  'user-shield': 'Shield',
  'envelope': 'Mail',
  'file-contract': 'FileText',
  'file-alt': 'FileText',
  'times': 'X',
  'spinner-third': 'Loader2',
  'spinner': 'Loader',
  'circle-notch': 'Loader2',
  'sync-alt': 'RefreshCw',
  'money-bill': 'Banknote',
  'money-bill-wave': 'Banknote',
  'coins': 'Coins',
  'wallet': 'Wallet',
  'receipt': 'Receipt',
  'credit-card': 'CreditCard',
  'credit-card-front': 'CreditCard',
  'bullhorn': 'Megaphone',
  'chart-line': 'LineChart',
  'rocket': 'Rocket',
  'tag': 'Tag',
  'check': 'Check',
  'check-circle': 'CheckCircle',
  'times-circle': 'XCircle',
  'exclamation-circle': 'AlertCircle',
  'exclamation-triangle': 'AlertTriangle',
  'info-circle': 'Info',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-down-left': 'ArrowDownLeft',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'chevron-up': 'ChevronUp',
  'chevron-down': 'ChevronDown',
  'microphone': 'Mic',
  'lightbulb': 'Lightbulb',
  'phone-alt': 'Phone',
  'phone': 'Phone',
  'eye': 'Eye',
  'eye-slash': 'EyeOff',
  'bell': 'Bell',
  'bell-slash': 'BellOff',
  'medal': 'Medal',
  'award': 'Award',
  'crown': 'Crown',
  'link': 'Link',
  'expand-alt': 'Maximize2',
  'star': 'Star',
  'star-outline': 'Star', // We'll just map it to Star, but wait, Lucide's Star is outlined by default unless `fill` is used. Wait.
  'stars': 'Sparkles',
  'box': 'Package',
  'box-open': 'PackageOpen',
  'box-check': 'PackageCheck',
  'newspaper': 'Newspaper',
  'twitter': 'MessageCircle',
  'facebook': 'Facebook',
  'facebook-f': 'Facebook',
  'envelope-open-text': 'MailOpen',
  'google': 'Globe',
  'whatsapp': 'MessageCircle', // Fallback
  'plus': 'Plus',
  'ellipsis-h': 'MoreHorizontal',
  'layer-plus': 'Layers',
  'edit': 'Edit2',
  'pen': 'Pen',
  'trash': 'Trash2',
  'trash-alt': 'Trash2',
  'shopping-cart': 'ShoppingCart',
  'shopping-bag': 'ShoppingBag',
  'store-slash': 'Store',
  'map-marker': 'MapPin',
  'map-marker-alt': 'MapPin',
  'save': 'Save',
  'percent': 'Percent',
  'gift': 'Gift',
  'truck': 'Truck',
  'truck-fast': 'Truck',
  'truck-moving': 'Truck',
  'motorcycle': 'Bike',
  'mobile': 'Smartphone',
  'mobile-alt': 'Smartphone',
  'copy': 'Copy',
  'user': 'User',
  'list-ol': 'ListOrdered',
  'image': 'Image',
  'images': 'Images',
  'cloud-upload': 'CloudUpload',
  'print': 'Printer',
  'camera': 'Camera',
  'ticket-alt': 'Ticket',
  'bolt': 'Zap',
  'share-alt': 'Share2',
  'shield-check': 'ShieldCheck',
  'shield-alt': 'Shield',
  'search': 'Search',
  'search-plus': 'ZoomIn',
  'history': 'History',
  'headset': 'Headphones',
  'comment-alt-lines': 'MessageSquare',
  'paper-plane': 'Send',
  'pause': 'Pause',
  'gem': 'Gem',
  'quote-right': 'Quote',
  'heart': 'Heart',
  'cog': 'Settings',
  'sign-out-alt': 'LogOut',
  'lock': 'Lock',
  'unlock': 'Unlock',
  'smile': 'Smile',
  'frown': 'Frown',
  'hourglass-half': 'Hourglass',
  'ban': 'Ban',
  'cubes': 'Boxes',
  'boxes': 'Boxes',
  'users-cog': 'Users',
  'users': 'Users',
  'comment-dots': 'MessageSquare',
  'sliders-h': 'Sliders',
  'ticket': 'Ticket',
  'undo': 'Undo',
  'id-badge': 'Contact',
  'file-invoice-dollar': 'Receipt',
  'file-csv': 'FileSpreadsheet',
  'trend-up': 'TrendingUp',
  'shield': 'Shield',
  'inbox': 'Inbox',
  'video': 'Video',
  'clock': 'Clock',
  'profile-order-pay': 'CreditCard',
  'profile-order-ship': 'Truck',
  'profile-order-receive': 'Package',
  'profile-order-review': 'MessageSquare',
  'profile-affiliate': 'Link',
  'profile-creator-hub': 'Presentation',
  'profile-small-creators': 'Gift',
  'profile-admin-panel': 'Shield',
  'profile-seller-dashboard': 'Store',
  'profile-kyc': 'ShieldCheck',
  'profile-messages': 'MessageSquare',
  'profile-affiliate-dashboard-payment': 'Wallet',
  'help-circle': 'HelpCircle',
  'info': 'Info',
  'minus': 'Minus',
  'log-out': 'LogOut',
  'bar-chart': 'BarChart3',
  'layout': 'Layout',
  'store': 'Store',
  'list-plus': 'ListPlus',
  'loader-2': 'Loader2',
  'phone-off': 'PhoneOff',
  'video-off': 'VideoOff',
  'paperclip': 'Paperclip',
  'send': 'Send',
  'check-double': 'CheckCheck',
  'message-square-share': 'MessageSquareShare',
  'message-square': 'MessageSquare',
  'sparkles': 'Sparkles',
  'pin': 'Pin',
  'pin-off': 'PinOff',
  'volume-mute': 'VolumeX',
  'volume-x': 'VolumeX',
  'forward': 'CornerUpRight',
  'more-vertical': 'MoreVertical',
  'user-plus': 'UserPlus',
  'user-minus': 'UserMinus',
  'user-x': 'UserX',
  'radio': 'Radio',
  'minimize-2': 'Minimize2',
  'maximize-2': 'Maximize2',
  'hash': 'Hash',
  'volume-2': 'Volume2',
  'mic': 'Mic',
  'mic-off': 'MicOff',
  'activity': 'Activity',
}

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

let customIconsCache: Record<string, string> = {};
try {
  const cached = localStorage.getItem('custom_icons_cache');
  if (cached) {
    const parsed = JSON.parse(cached);
    const cleaned: Record<string, string> = {};
    Object.keys(parsed).forEach(k => {
      if (typeof parsed[k] === 'string' && k !== 'icons') {
        cleaned[k.toLowerCase()] = parsed[k];
      }
    });
    customIconsCache = cleaned;
  }
} catch (e) {
  console.warn("Failed to read custom icons cache from localStorage", e);
}

const listeners = new Set<() => void>();
let isListening = false;

function initCustomIconsListener() {
  if (isListening) return;
  isListening = true;
  try {
    onSnapshot(doc(db, 'settings', 'custom_icons'), (snap) => {
      // If the snapshot is from the local Firestore cache and we already have cached icons,
      // ignore it to prevent flickering to stale/old cached icons on page load.
      if (snap.metadata.fromCache && Object.keys(customIconsCache).length > 0) {
        return;
      }
      if (snap.exists()) {
        const data = snap.data();
        const rawIcons = data?.icons || data || {};
        const cleaned: Record<string, string> = {};
        Object.keys(rawIcons).forEach(k => {
          if (typeof rawIcons[k] === 'string' && k !== 'icons') {
            cleaned[k.toLowerCase()] = rawIcons[k];
          }
        });
        customIconsCache = cleaned;
        try {
          localStorage.setItem('custom_icons_cache', JSON.stringify(customIconsCache));
        } catch (e) {
          console.warn("Failed to write custom icons cache to localStorage", e);
        }
      } else {
        customIconsCache = {};
        try {
          localStorage.removeItem('custom_icons_cache');
        } catch (e) {}
      }
      listeners.forEach(l => l());
    }, (err) => {
      console.warn("Custom icons listener error", err);
    });
  } catch (e) {
    console.warn("Failed to initialize custom icons listener", e);
  }
}

const Icon: React.FC<IconProps> = ({ name, className = '', solid = false, ...props }) => {
  const pascalName = (customIconMapping[name] || formatNameToPascal(name)) as keyof typeof LucideIcons;
  const LucideIcon = LucideIcons[pascalName] as React.FC<any> | undefined;

  const [customSvg, setCustomSvg] = useState<string | null>(() => {
    const key = name.toLowerCase();
    const mappedKey = pascalName ? String(pascalName).toLowerCase() : '';
    return customIconsCache[key] || customIconsCache[mappedKey] || customIconsCache[name] || null;
  });

  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  useEffect(() => {
    initCustomIconsListener();
    const updateIcon = () => {
      const key = name.toLowerCase();
      const mappedKey = pascalName ? String(pascalName).toLowerCase() : '';
      const svg = customIconsCache[key] || customIconsCache[mappedKey] || customIconsCache[name];
      setCustomSvg(svg || null);
    };
    updateIcon();
    listeners.add(updateIcon);
    return () => {
      listeners.delete(updateIcon);
    };
  }, [name, pascalName]);

  const hasSize = /\b(w-\d+|w-\[.*?\]|w-auto|w-full|w-screen|w-min|w-max|w-fit|size-\d+|size-\[.*?\]|h-\d+|h-\[.*?\]|h-auto|h-full|h-screen|h-min|h-max|h-fit|text-(xs|sm|base|lg|[2-9]xl|\[.*?\]))\b/.test(className);
  
  const finalClass = hasSize ? className : `${className} w-5 h-5`.trim();
  const hasWidthClass = /\b(w-\d+|w-\[.*?\]|w-auto|w-full|w-screen|w-min|w-max|w-fit|size-\d+|size-\[.*?\])\b/.test(finalClass);

  if (customSvg) {
    const isBrandOrSolid = name.includes('facebook') || name.includes('instagram') || name.includes('twitter') || name.includes('google') || name.includes('whatsapp') || name.includes('logo') || name.includes('solid') || name.includes('brand');

    return (
      <span 
        className={`custom-icon-container-${cleanName} inline-flex shrink-0 items-center justify-center ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`}
        {...props}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-icon-container-${cleanName} svg path:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg line:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg circle:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg rect:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg polyline:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg polygon:not(.c):not(.svgC):not(.c1),
          .custom-icon-container-${cleanName} svg g:not(.c):not(.svgC):not(.c1) > * {
            fill: ${isBrandOrSolid ? 'currentColor' : (solid ? 'rgba(32, 78, 207, 0.15)' : 'none')};
            fill-opacity: ${isBrandOrSolid ? '1' : (solid ? '1' : '0')};
            stroke: ${isBrandOrSolid ? 'none' : 'currentColor'};
            stroke-width: ${isBrandOrSolid ? '0' : (solid ? '2.5px' : '1.75px')};
            transition: fill 0.3s ease, fill-opacity 0.3s ease, stroke 0.3s ease, stroke-width 0.3s ease;
          }
          .custom-icon-container-${cleanName} svg .c,
          .custom-icon-container-${cleanName} svg .svgC,
          .custom-icon-container-${cleanName} svg .c1 {
            stroke: var(--linkC, #204ecf) !important;
            fill: none;
            transition: stroke 0.3s ease, fill 0.3s ease;
          }
          .dark .custom-icon-container-${cleanName} svg .c,
          .dark .custom-icon-container-${cleanName} svg .svgC,
          .dark .custom-icon-container-${cleanName} svg .c1 {
            stroke: var(--darkU, #3b82f6) !important;
          }
        `}} />
        <div 
          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: customSvg }} 
        />
      </span>
    );
  }

  if (!LucideIcon) {
    if (name !== 'default') {
      console.warn(`Icon ${name} not found in Lucide (pascal: ${pascalName})`);
    }
    return null;
  }

  return (
    <span 
      className={`inline-flex shrink-0 items-center justify-center [&>svg]:w-full [&>svg]:h-full ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`}
      {...props}
    >
      <LucideIcon strokeWidth={solid ? 3 : 2} fill={solid ? "currentColor" : "none"} />
    </span>
  );
};

export default Icon;
