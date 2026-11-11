import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  getCustomIconFromCache,
  initCustomIconsStore,
  subscribeCustomIcons,
} from '../lib/customIconStore';
import { normalizeCustomSvg } from '../lib/svgNormalize';

export type IconName = string;

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  className?: string;
  solid?: boolean;
}

const formatNameToPascal = (str: string) => {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};

const customIconMapping: Record<string, keyof typeof LucideIcons> = {
  'bars': 'Menu',
  'instagram': 'Camera',
  'user-shield': 'Shield',
  'envelope': 'Mail',
  'file-contract': 'FileText',
  'file-alt': 'FileText',
  'file-text': 'FileText',
  'times': 'X',
  'x': 'X',
  'spinner-third': 'Loader2',
  'spinner': 'Loader2',
  'circle-notch': 'Loader2',
  'loader-2': 'Loader2',
  'sync-alt': 'RefreshCw',
  'refresh-cw': 'RefreshCw',
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
  'check-circle-2': 'CheckCircle2',
  'times-circle': 'XCircle',
  'exclamation-circle': 'AlertCircle',
  'alert-circle': 'AlertCircle',
  'exclamation-triangle': 'AlertTriangle',
  'alert-triangle': 'AlertTriangle',
  'info-circle': 'Info',
  'info': 'Info',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'arrow-up': 'ArrowUp',
  'arrow-up-right': 'ArrowUpRight',
  'arrow-down': 'ArrowDown',
  'arrow-down-left': 'ArrowDownLeft',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'chevron-up': 'ChevronUp',
  'chevron-down': 'ChevronDown',
  'microphone': 'Mic',
  'mic': 'Mic',
  'mic-off': 'MicOff',
  'lightbulb': 'Lightbulb',
  'phone-alt': 'Phone',
  'phone': 'Phone',
  'phone-call': 'PhoneCall',
  'phone-off': 'PhoneOff',
  'eye': 'Eye',
  'eye-slash': 'EyeOff',
  'eye-off': 'EyeOff',
  'bell': 'Bell',
  'bell-slash': 'BellOff',
  'bell-off': 'BellOff',
  'medal': 'Medal',
  'award': 'Award',
  'crown': 'Crown',
  'link': 'Link',
  'link-2': 'Link2',
  'external-link': 'ExternalLink',
  'expand-alt': 'Maximize2',
  'maximize-2': 'Maximize2',
  'minimize-2': 'Minimize2',
  'star': 'Star',
  'star-outline': 'Star',
  'stars': 'Sparkles',
  'sparkles': 'Sparkles',
  'box': 'Package',
  'box-open': 'PackageOpen',
  'box-check': 'PackageCheck',
  'newspaper': 'Newspaper',
  'twitter': 'MessageCircle',
  'facebook': 'Share2',
  'facebook-f': 'Share2',
  'envelope-open-text': 'MailOpen',
  'google': 'Globe',
  'globe': 'Globe',
  'whatsapp': 'MessageCircle',
  'plus': 'Plus',
  'minus': 'Minus',
  'ellipsis-h': 'MoreHorizontal',
  'more-horizontal': 'MoreHorizontal',
  'more-vertical': 'MoreVertical',
  'layer-plus': 'Layers',
  'layers': 'Layers',
  'edit': 'Edit2',
  'edit-2': 'Edit2',
  'edit-3': 'Edit3',
  'pen': 'Pen',
  'pen-line': 'PenLine',
  'pencil': 'Pencil',
  'trash': 'Trash2',
  'trash-alt': 'Trash2',
  'trash-2': 'Trash2',
  'shopping-cart': 'ShoppingCart',
  'shopping-bag': 'ShoppingBag',
  'store-slash': 'Store',
  'store': 'Store',
  'map-marker': 'MapPin',
  'map-marker-alt': 'MapPin',
  'map-pin': 'MapPin',
  'save': 'Save',
  'percent': 'Percent',
  'gift': 'Gift',
  'truck': 'Truck',
  'truck-fast': 'Truck',
  'truck-moving': 'Truck',
  'motorcycle': 'Bike',
  'mobile': 'Smartphone',
  'mobile-alt': 'Smartphone',
  'smartphone': 'Smartphone',
  'copy': 'Copy',
  'user': 'User',
  'user-check': 'UserCheck',
  'user-plus': 'UserPlus',
  'user-minus': 'UserMinus',
  'user-x': 'UserX',
  'list-ol': 'ListOrdered',
  'image': 'Image',
  'image-plus': 'ImagePlus',
  'images': 'Images',
  'cloud-upload': 'CloudUpload',
  'print': 'Printer',
  'camera': 'Camera',
  'ticket-alt': 'Ticket',
  'ticket': 'Ticket',
  'bolt': 'Zap',
  'zap': 'Zap',
  'share-alt': 'Share2',
  'share-2': 'Share2',
  'shield-check': 'ShieldCheck',
  'shield-alt': 'Shield',
  'shield-alert': 'ShieldAlert',
  'shield': 'Shield',
  'search': 'Search',
  'search-plus': 'ZoomIn',
  'history': 'History',
  'headset': 'Headphones',
  'headphones': 'Headphones',
  'comment-alt-lines': 'MessageSquare',
  'comment-dots': 'MessageSquare',
  'message-square': 'MessageSquare',
  'message-circle': 'MessageCircle',
  'message-square-share': 'MessageSquareShare',
  'message-square-warning': 'MessageSquareWarning',
  'paper-plane': 'Send',
  'send': 'Send',
  'pause': 'Pause',
  'play': 'Play',
  'music': 'Music',
  'gem': 'Gem',
  'quote-right': 'Quote',
  'quote': 'Quote',
  'heart': 'Heart',
  'cog': 'Settings',
  'settings': 'Settings',
  'logout': 'LogOut',
  'log-out': 'LogOut',
  'sign-out': 'LogOut',
  'sign-out-alt': 'LogOut',
  'login': 'LogIn',
  'log-in': 'LogIn',
  'sign-in': 'LogIn',
  'sign-in-alt': 'LogIn',
  'close': 'X',
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
  'sliders-h': 'Sliders',
  'sliders-horizontal': 'SlidersHorizontal',
  'undo': 'Undo',
  'id-badge': 'Contact',
  'file-invoice-dollar': 'Receipt',
  'file-csv': 'FileSpreadsheet',
  'trend-up': 'TrendingUp',
  'trending-up': 'TrendingUp',
  'inbox': 'Mail',
  'video': 'Video',
  'video-off': 'VideoOff',
  'clock': 'Clock',
  'calendar': 'Calendar',
  'bookmark': 'Bookmark',
  'palette': 'Palette',
  'archive': 'Archive',
  'pin': 'Pin',
  'pin-off': 'PinOff',
  'volume-mute': 'VolumeX',
  'volume-x': 'VolumeX',
  'volume-2': 'Volume2',
  'forward': 'CornerUpRight',
  'paperclip': 'Paperclip',
  'check-double': 'CheckCheck',
  'radio': 'Radio',
  'monitor': 'Monitor',
  'hash': 'Hash',
  'activity': 'Activity',
  'compass': 'Compass',
  'bot': 'Bot',
  'flame': 'Flame',
  'wrench': 'Wrench',
  'cpu': 'Cpu',
  'battery': 'Battery',
  'graduation-cap': 'GraduationCap',
  'sun': 'Sun',
  'moon': 'Moon',
  'infinity': 'Infinity',
  'qr-code': 'QrCode',
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
  'bar-chart': 'BarChart3',
  'layout': 'Layout',
  'layout-dashboard': 'LayoutDashboard',
  'layout-grid': 'LayoutGrid',
  'list-plus': 'ListPlus',
  'messages-home': 'Home',
  'messages-inbox': 'MessageCircle',
  'messages-activity': 'Calendar',
  'messages-profile': 'User',
  'messages-plus': 'Plus',
};

const ICON_FALLBACK_ALIASES: Record<string, string[]> = {
  'messages-home': ['messages-home', 'home', 'bottom-nav-home'],
  'messages-inbox': ['messages-inbox', 'message-circle', 'comment-dots', 'message-square'],
  'messages-activity': ['messages-activity', 'calendar', 'activity'],
  'messages-profile': ['messages-profile', 'user', 'profile'],
  'messages-plus': ['messages-plus', 'plus', 'add'],
  'message-square': [
    'message-square',
    'comment-dots',
    'profile-messages',
    'loops-nav-messages',
    'comment-alt-lines',
    'envelope',
  ],
  'comment-dots': [
    'comment-dots',
    'message-square',
    'profile-messages',
    'loops-nav-messages',
  ],
  'shopping-cart': ['shopping-cart', 'cart', 'shopping-bag'],
  'home': ['home', 'bottom-nav-home', 'loops-nav-home'],
  'doc': ['doc', 'bottom-nav-doc', 'document', 'file-text', 'receipt', 'orders'],
  'file-text': ['file-text', 'doc', 'bottom-nav-doc', 'document'],
  'search': ['search', 'bottom-nav-search', 'loops-nav-search'],
  'user': ['user', 'profile', 'bottom-nav-profile', 'loops-nav-profile'],
  'trash-2': ['trash-2', 'trash', 'trash-alt', 'msg-trash'],
  'trash': ['trash', 'trash-2', 'trash-alt'],
  'edit-3': ['edit-3', 'edit', 'pencil', 'edit-2'],
  'edit': ['edit', 'edit-3', 'pencil'],
  'phone': ['phone', 'phone-call', 'msg-phone-call', 'phone-alt'],
  'video': ['video', 'msg-video-call'],
  'mic': ['mic', 'microphone', 'msg-mic'],
  'map-marker': ['map-marker', 'map-pin', 'map-marker-alt'],
  'shield-alert': ['shield-alert', 'alert-triangle', 'shield'],
  'volume-x': ['volume-x', 'volume-mute'],
  'sliders-h': ['sliders-h', 'sliders', 'sliders-horizontal'],
  'sliders-horizontal': ['sliders-horizontal', 'sliders-h', 'sliders'],
};

const HARDCODED_SVGS: Record<string, string> = {
  'compass': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM13.8489 9.18125C13.244 9.34164 12.4287 9.66626 11.2543 10.136C10.7129 10.3526 10.6121 10.4036 10.538 10.4686C10.5134 10.4902 10.4902 10.5134 10.4686 10.538C10.4036 10.6121 10.3526 10.7129 10.136 11.2543C9.66626 12.4287 9.34164 13.244 9.18125 13.8489C9.01425 14.4789 9.0961 14.6399 9.12239 14.6786C9.17553 14.6786 9.24298 14.8242 9.32118 14.8774C9.35986 14.9037 9.52089 14.9855 10.1508 14.8185C10.7558 14.6581 11.571 14.3335 12.7454 13.8637C13.2868 13.6472 13.3876 13.5961 13.4617 13.5311L13.9562 14.095L13.4617 13.5311C13.4864 13.5095 13.5095 13.4864 13.5311 13.4617L14.095 13.9562L13.5311 13.4617C13.5961 13.3876 13.6472 13.2868 13.8637 12.7454C14.3335 11.571 14.6581 10.7558 14.8185 10.1508C14.9855 9.52089 14.9037 9.35986 14.8774 9.32118C14.8242 9.24298 14.7568 9.17553 14.6786 9.12239C14.6399 9.0961 14.4789 9.01425 13.8489 9.18125ZM13.4646 7.73134C14.1544 7.54845 14.9007 7.45976 15.5217 7.88173C15.7563 8.04115 15.9586 8.2435 16.118 8.47811C16.54 9.09908 16.4513 9.84532 16.2684 10.5352C16.0817 11.2394 15.7215 12.14 15.2766 13.2522L15.2565 13.3025C15.2452 13.3307 15.234 13.3586 15.223 13.3864C15.0598 13.7958 14.9155 14.1582 14.6589 14.4507C14.5941 14.5246 14.5246 14.5941 14.4507 14.6589C14.1582 14.9155 13.7958 15.0598 13.3864 15.223C13.3587 15.234 13.3307 15.2452 13.3025 15.2564L13.024 14.5601L13.3025 15.2565L13.2522 15.2766C12.14 15.7215 11.2394 16.0817 10.5352 16.2684C9.84532 16.4513 9.09908 16.54 8.47811 16.118L8.89964 15.4977L8.47811 16.118C8.2435 15.9586 8.04115 15.7563 7.88173 15.5217C7.45976 14.9007 7.54845 14.1544 7.73134 13.4646C7.91804 12.7603 8.27829 11.8597 8.72318 10.7476L8.74331 10.6973C8.75458 10.6691 8.76572 10.6411 8.77677 10.6134C8.93992 10.2039 9.08429 9.8416 9.34085 9.54904C9.40562 9.47517 9.47517 9.40562 9.54904 9.34085C9.8416 9.08429 10.2039 8.93992 10.6134 8.77677C10.6411 8.76572 10.6691 8.75458 10.6973 8.74331L10.7476 8.72318C11.8598 8.27828 12.7603 7.91804 13.4646 7.73134Z" fill="currentColor"></path></svg>',
  'compas': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM13.8489 9.18125C13.244 9.34164 12.4287 9.66626 11.2543 10.136C10.7129 10.3526 10.6121 10.4036 10.538 10.4686C10.5134 10.4902 10.4902 10.5134 10.4686 10.538C10.4036 10.6121 10.3526 10.7129 10.136 11.2543C9.66626 12.4287 9.34164 13.244 9.18125 13.8489C9.01425 14.4789 9.0961 14.6399 9.12239 14.6786C9.17553 14.6786 9.24298 14.8242 9.32118 14.8774C9.35986 14.9037 9.52089 14.9855 10.1508 14.8185C10.7558 14.6581 11.571 14.3335 12.7454 13.8637C13.2868 13.6472 13.3876 13.5961 13.4617 13.5311L13.9562 14.095L13.4617 13.5311C13.4864 13.5095 13.5095 13.4864 13.5311 13.4617L14.095 13.9562L13.5311 13.4617C13.5961 13.3876 13.6472 13.2868 13.8637 12.7454C14.3335 11.571 14.6581 10.7558 14.8185 10.1508C14.9855 9.52089 14.9037 9.35986 14.8774 9.32118C14.8242 9.24298 14.7568 9.17553 14.6786 9.12239C14.6399 9.0961 14.4789 9.01425 13.8489 9.18125ZM13.4646 7.73134C14.1544 7.54845 14.9007 7.45976 15.5217 7.88173C15.7563 8.04115 15.9586 8.2435 16.118 8.47811C16.54 9.09908 16.4513 9.84532 16.2684 10.5352C16.0817 11.2394 15.7215 12.14 15.2766 13.2522L15.2565 13.3025C15.2452 13.3307 15.234 13.3586 15.223 13.3864C15.0598 13.7958 14.9155 14.1582 14.6589 14.4507C14.5941 14.5246 14.5246 14.5941 14.4507 14.6589C14.1582 14.9155 13.7958 15.0598 13.3864 15.223C13.3587 15.234 13.3307 15.2452 13.3025 15.2564L13.024 14.5601L13.3025 15.2565L13.2522 15.2766C12.14 15.7215 11.2394 16.0817 10.5352 16.2684C9.84532 16.4513 9.09908 16.54 8.47811 16.118L8.89964 15.4977L8.47811 16.118C8.2435 15.9586 8.04115 15.7563 7.88173 15.5217C7.45976 14.9007 7.54845 14.1544 7.73134 13.4646C7.91804 12.7603 8.27829 11.8597 8.72318 10.7476L8.74331 10.6973C8.75458 10.6691 8.76572 10.6411 8.77677 10.6134C8.93992 10.2039 9.08429 9.8416 9.34085 9.54904C9.40562 9.47517 9.47517 9.40562 9.54904 9.34085C9.8416 9.08429 10.2039 8.93992 10.6134 8.77677C10.6411 8.76572 10.6691 8.75458 10.6973 8.74331L10.7476 8.72318C11.8598 8.27828 12.7603 7.91804 13.4646 7.73134Z" fill="currentColor"></path></svg>',
  'explore': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM13.8489 9.18125C13.244 9.34164 12.4287 9.66626 11.2543 10.136C10.7129 10.3526 10.6121 10.4036 10.538 10.4686C10.5134 10.4902 10.4902 10.5134 10.4686 10.538C10.4036 10.6121 10.3526 10.7129 10.136 11.2543C9.66626 12.4287 9.34164 13.244 9.18125 13.8489C9.01425 14.4789 9.0961 14.6399 9.12239 14.6786C9.17553 14.7568 9.24298 14.8242 9.32118 14.8774C9.35986 14.9037 9.52089 14.9855 10.1508 14.8185C10.7558 14.6581 11.571 14.3335 12.7454 13.8637C13.2868 13.6472 13.3876 13.5961 13.4617 13.5311L13.9562 14.095L13.4617 13.5311C13.4864 13.5095 13.5095 13.4864 13.5311 13.4617L14.095 13.9562L13.5311 13.4617C13.5961 13.3876 13.6472 13.2868 13.8637 12.7454C14.3335 11.571 14.6581 10.7558 14.8185 10.1508C14.9855 9.52089 14.9037 9.35986 14.8774 9.32118C14.8242 9.24298 14.7568 9.17553 14.6786 9.12239C14.6399 9.0961 14.4789 9.01425 13.8489 9.18125ZM13.4646 7.73134C14.1544 7.54845 14.9007 7.45976 15.5217 7.88173C15.7563 8.04115 15.9586 8.2435 16.118 8.47811C16.54 9.09908 16.4513 9.84532 16.2684 10.5352C16.0817 11.2394 15.7215 12.14 15.2766 13.2522L15.2565 13.3025C15.2452 13.3307 15.234 13.3586 15.223 13.3864C15.0598 13.7958 14.9155 14.1582 14.6589 14.4507C14.5941 14.5246 14.5246 14.5941 14.4507 14.6589C14.1582 14.9155 13.7958 15.0598 13.3864 15.223C13.3587 15.234 13.3307 15.2452 13.3025 15.2564L13.024 14.5601L13.3025 15.2565L13.2522 15.2766C12.14 15.7215 11.2394 16.0817 10.5352 16.2684C9.84532 16.4513 9.09908 16.54 8.47811 16.118L8.89964 15.4977L8.47811 16.118C8.2435 15.9586 8.04115 15.7563 7.88173 15.5217C7.45976 14.9007 7.54845 14.1544 7.73134 13.4646C7.91804 12.7603 8.27829 11.8597 8.72318 10.7476L8.74331 10.6973C8.75458 10.6691 8.76572 10.6411 8.77677 10.6134C8.93992 10.2039 9.08429 9.8416 9.34085 9.54904C9.40562 9.47517 9.47517 9.40562 9.54904 9.34085C9.8416 9.08429 10.2039 8.93992 10.6134 8.77677C10.6411 8.76572 10.6691 8.75458 10.6973 8.74331L10.7476 8.72318C11.8598 8.27828 12.7603 7.91804 13.4646 7.73134Z" fill="currentColor"></path></svg>',
};

function resolveCustomSvgFromCache(
  name: string,
  mappedKey: string
): { svg: string | null; isUserCustom: boolean } {
  const key = (name || '').toLowerCase().trim();
  const candidates = ICON_FALLBACK_ALIASES[key] || [key, mappedKey, name];
  const hit = getCustomIconFromCache([...candidates, mappedKey, name]);
  if (hit) {
    return { svg: hit, isUserCustom: true };
  }
  const hardcoded = HARDCODED_SVGS[key] || HARDCODED_SVGS[mappedKey] || null;
  return { svg: hardcoded, isUserCustom: false };
}

export function useCustomIconSvg(name: string): string | null {
  const normKey = (name || '').toLowerCase().trim();
  const mappedKey = String(
    customIconMapping[normKey] || customIconMapping[name] || formatNameToPascal(name) || ''
  ).toLowerCase();

  const [svg, setSvg] = useState<string | null>(() => {
    const resolved = resolveCustomSvgFromCache(name, mappedKey);
    return resolved.isUserCustom ? resolved.svg : null;
  });

  useEffect(() => {
    initCustomIconsStore();
    const sync = () => {
      const resolved = resolveCustomSvgFromCache(name, mappedKey);
      setSvg(resolved.isUserCustom ? resolved.svg : null);
    };
    sync();
    return subscribeCustomIcons(sync);
  }, [name, mappedKey]);

  return svg;
}

const Icon: React.FC<IconProps> = ({ name, className = '', solid = false, ...props }) => {
  const normKey = (name || '').toLowerCase().trim();
  const pascalName = (customIconMapping[normKey] || customIconMapping[name] || formatNameToPascal(name)) as keyof typeof LucideIcons;
  const LucideIcon = LucideIcons[pascalName] as React.FC<any> | undefined;
  const mappedKey = pascalName ? String(pascalName).toLowerCase() : '';

  const [resolvedIcon, setResolvedIcon] = useState<{ svg: string | null; isUserCustom: boolean }>(() =>
    resolveCustomSvgFromCache(name, mappedKey)
  );

  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  useEffect(() => {
    initCustomIconsStore();
    const updateIcon = () => {
      setResolvedIcon(resolveCustomSvgFromCache(name, mappedKey));
    };
    updateIcon();
    return subscribeCustomIcons(updateIcon);
  }, [name, mappedKey]);

  const hasSize = /\b(w-\d+(?:\.\d+)?|w-\[.*?\]|w-auto|w-full|w-screen|w-min|w-max|w-fit|size-\d+(?:\.\d+)?|size-\[.*?\]|h-\d+(?:\.\d+)?|h-\[.*?\]|h-auto|h-full|h-screen|h-min|h-max|h-fit|text-(xs|sm|base|lg|[2-9]xl|\[.*?\]))\b/.test(className);
  const finalClass = hasSize ? className : `${className} w-5 h-5`.trim();
  const hasWidthClass = /\b(w-\d+(?:\.\d+)?|w-\[.*?\]|w-auto|w-full|w-screen|w-min|w-max|w-fit|size-\d+(?:\.\d+)?|size-\[.*?\])\b/.test(finalClass);

  const customSvg = resolvedIcon.svg;

  if (customSvg) {
    const cleanSvg = customSvg.trim();
    if (cleanSvg.startsWith('http://') || cleanSvg.startsWith('https://') || cleanSvg.startsWith('data:') || cleanSvg.startsWith('/')) {
      return (
        <span className={`inline-flex shrink-0 items-center justify-center ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`} {...props}>
          <img src={cleanSvg} alt={name} className="w-full h-full object-contain" />
        </span>
      );
    }

    if (resolvedIcon.isUserCustom) {
      const normalized = normalizeCustomSvg(cleanSvg);
      return (
        <span className={`inline-flex shrink-0 items-center justify-center ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`} {...props}>
          <span
            className="w-full h-full inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: normalized }}
          />
        </span>
      );
    }

    const isBrandOrSolid = name.includes('facebook') || name.includes('instagram') || name.includes('twitter') || name.includes('google') || name.includes('whatsapp') || name.includes('logo') || name.includes('solid') || name.includes('brand') || name.includes('compass') || name.includes('explore') || name.includes('compas');

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
            fill: ${isBrandOrSolid ? 'currentColor' : (solid ? 'currentColor' : 'none')};
            fill-opacity: ${isBrandOrSolid ? '1' : (solid ? '0.15' : '0')};
            stroke: ${isBrandOrSolid ? 'none' : 'currentColor'};
            stroke-width: ${isBrandOrSolid ? '0' : (solid ? '2.25px' : '1.75px')};
            transition: fill 0.2s ease, fill-opacity 0.2s ease, stroke 0.2s ease;
          }
          .custom-icon-container-${cleanName} svg .c,
          .custom-icon-container-${cleanName} svg .svgC,
          .custom-icon-container-${cleanName} svg .c1 {
            stroke: currentColor !important;
            fill: none;
            transition: stroke 0.2s ease, fill 0.2s ease;
          }
        `}} />
        <span
          className="w-full h-full inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: cleanSvg }}
        />
      </span>
    );
  }

  if (!LucideIcon) {
    const FallbackIcon = (LucideIcons as any)['Mail'] || (LucideIcons as any)['HelpCircle'] || (LucideIcons as any)['Square'];
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center [&>svg]:w-full [&>svg]:h-full ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`}
        {...props}
      >
        {FallbackIcon ? <FallbackIcon strokeWidth={solid ? 2.5 : 1.9} fill={solid ? "currentColor" : "none"} /> : null}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center [&>svg]:w-full [&>svg]:h-full ${hasWidthClass ? '' : 'w-[1em] h-[1em]'} ${finalClass}`}
      {...props}
    >
      <LucideIcon strokeWidth={solid ? 2.5 : 1.9} fill={solid ? "currentColor" : "none"} />
    </span>
  );
};

export default Icon;
