import React from 'react';

// Streamline Flex Remix Free SVG factory
const c = (d: string[]) => React.forwardRef<SVGSVGElement, any>(({ size, strokeWidth = 1.5, className = '', ...props }, ref) => {
  const hasSize = className && /\b(w-\d+|w-\[.*?\]|size-\d+|size-\[.*?\]|h-\d+|h-\[.*?\])\b/.test(className);
  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      width={size || "24"}
      height={size || "24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={hasSize ? className : `w-5 h-5 ${className}`}
      {...props}
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
});

// Geometry database for Streamline Flex Remix Free (Outline) style
export const Activity = c(["M22 12h-4l-3 9L9 3 6 12H2"]);
export const AlertCircle = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 8v4", "M12 16h.01"]);
export const AlertTriangle = c(["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"]);
export const ArrowDown = c(["M12 5v14", "M19 12l-7 7-7-7"]);
export const ArrowDownLeft = c(["M17 7L7 17", "M17 17H7V7"]);
export const ArrowLeft = c(["M19 12H5", "M12 19l-7-7 7-7"]);
export const ArrowLeftRight = c(["M8 7h12", "M20 7l-4-4", "M20 7l-4 4", "M16 17H4", "M4 17l4-4", "M4 17l4 4"]);
export const ArrowRight = c(["M5 12h14", "M12 5l7 7-7 7"]);
export const ArrowUp = c(["M12 19V5", "M5 12l7-7 7 7"]);
export const ArrowUpRight = c(["M7 17L17 7", "M7 7h10v10"]);
export const AtSign = c(["M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0", "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"]);
export const Award = c(["M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M8.21 13.89L7 23l5-3 5 3-1.21-9.12"]);
export const BarChart3 = c(["M18 20V10", "M12 20V4", "M6 20v-6"]);
export const Bell = c(["M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3V8z", "M9 19a3 3 0 0 0 6 0"]);
export const Bike = c(["M5.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M18.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M15 17.5l-3-6H7.5l-2 6", "M12 11.5L16 6h2", "M12 11.5h3l3.5 6"]);
export const Bitcoin = c(["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", "M9 2v3", "M13 2v3", "M9 19v3", "M13 19v3"]);
export const BookOpen = c(["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"]);
export const Bookmark = c(["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"]);
export const Bot = c(["M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z", "M12 2v4", "M8 6h8", "M6 11V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2", "M9 15h.01", "M15 15h.01"]);
export const Box = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8"]);
export const Boxes = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8", "M16 4.5l-4 2.5-4-2.5"]);
export const Calendar = c(["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z", "M16 2v4", "M8 2v4", "M3 10h18"]);
export const CalendarDays = c(["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z", "M16 2v4", "M8 2v4", "M3 10h18", "M8 14h.01", "M12 14h.01", "M16 14h.01", "M8 18h.01", "M12 18h.01", "M16 18h.01"]);
export const Camera = c(["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]);
export const Check = c(["M20 6L9 17l-5-5"]);
export const CheckCheck = c(["M17 6L8.5 14.5 5 11", "M22 6L13.5 14.5 12 13"]);
export const CheckCircle = c(["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"]);
export const CheckCircle2 = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M8 12l3 3 5-5"]);
export const CheckIcon = c(["M20 6L9 17l-5-5"]);
export const ChevronDown = c(["M6 9l6 6 6-6"]);
export const ChevronLeft = c(["M15 19l-7-7 7-7"]);
export const ChevronRight = c(["M9 5l7 7-7 7"]);
export const ChevronUp = c(["M18 15l-7-7-7 7"]);
export const Circle = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"]);
export const CircleDollarSign = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M16 8h-4a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5h-4", "M12 6v12"]);
export const Clipboard = c(["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "M8 2h8v4H8z"]);
export const ClipboardList = c(["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "M8 2h8v4H8z", "M9 10h6", "M9 14h6", "M9 18h6"]);
export const Clock = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 6v6l4 2"]);
export const Coins = c(["M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M16 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M12 8a6 6 0 0 1 6 6", "M6 16a6 6 0 0 1 6-6"]);
export const Copy = c(["M9 9h13v13H9z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"]);
export const CornerUpLeft = c(["M9 14L4 9l5-5", "M20 20v-7a4 4 0 0 0-4-4H4"]);
export const CreditCard = c(["M1 6a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6z", "M1 10h22"]);
export const Crown = c(["M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"]);
export const Diamond = c(["M12 2L2 12l10 10 10-10z"]);
export const DollarSign = c(["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"]);
export const Download = c(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"]);
export const Upload = c(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]);
export const Edit = c(["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"]);
export const Edit2 = Edit;
export const Edit3 = Edit;
export const ExternalLink = c(["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14L21 3"]);
export const Eye = c(["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]);
export const EyeOff = c(["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19", "M1 1l22 22"]);
export const FileText = c(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"]);
export const Filter = c(["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"]);
export const Film = c(["M2 4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z", "M7 2v20", "M17 2v20", "M2 12h20", "M2 7h5", "M2 17h5", "M17 17h5", "M17 7h5"]);
export const Forward = c(["M15 17l5-5-5-5", "M4 18v-2a4 4 0 0 1 4-4h12"]);
export const Gift = c(["M20 12v10H4V12", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z", "M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"]);
export const Globe = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]);
export const Headphones = c(["M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9v5a2 2 0 0 1-2 2h-1v-6h3v-1c0-3.87-3.13-7-7-7s-7 3.13-7 7v1h3v6h-1a2 2 0 0 1-2-2v-5z"]);
export const Headset = Headphones;
export const Heart = c(["M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"]);
export const HelpCircle = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"]);
export const History = c(["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5", "M12 7v5l4 2"]);
export const Home = React.forwardRef<SVGSVGElement, any>(({ size, strokeWidth, className = '', ...props }, ref) => {
  const hasSize = className && /\b(w-\d+|w-\[.*?\]|size-\d+|size-\[.*?\]|h-\d+|h-\[.*?\])\b/.test(className);
  const strokeW = strokeWidth !== undefined ? strokeWidth : 1;
  return (
    <svg
      ref={ref}
      viewBox="0 0 14 14"
      width={size || "24"}
      height={size || "24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={hasSize ? className : `w-5 h-5 ${className}`}
      {...props}
    >
      <g id="home-2--door-entrance-home-house-roof-round-shelter">
        <path id="Rectangle 15" d="M3.83679 12.7965h6.32661c0.6694 0 1.2388 -0.4884 1.3407 -1.1501 0.1619 -1.0516 0.1995 -2.1176 0.1124 -3.17619h1.2237c0.3943 0 0.6334 -0.43516 0.422 -0.76804l-0.2117 -0.33341C11.777 5.36357 10.1566 3.60127 8.265 2.16444l-0.66005 -0.50137c-0.35753 -0.27157 -0.85222 -0.27157 -1.20975 0l-0.66014 0.50143C3.84351 3.60128 2.22303 5.36355 0.949568 7.3687l-0.211779 0.33346c-0.211412 0.33288 0.027731 0.76805 0.422071 0.76805h1.22376c-0.08703 1.05859 -0.0495 2.12459 0.11243 3.17619 0.10189 0.6617 0.67126 1.1501 1.34074 1.1501Z" />
        <path id="Vector (Stroke)" d="M7.00013 8.08887c0.92099 0 1.66761 0.74661 1.66761 1.66761v3.03992H5.33252V9.75648c0 -0.921 0.74661 -1.66761 1.66761 -1.66761Z" />
      </g>
    </svg>
  );
});
export const HomeIcon = Home;
export const Image = c(["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M21 15l-5-5L5 21"]);
export const ImagePlus = c(["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M21 15l-5-5L5 21", "M12 5v6", "M9 8h6"]);
export const Info = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 16v-4", "M12 8h.01"]);
export const InfoIcon = Info;
export const KeyRound = c(["M21.5 2.5a6.5 6.5 0 1 0-7.73 7.73L9 15v3H6v3H3v3h5l5.27-5.27a6.5 6.5 0 0 0 7.23-11.23z", "M18.5 5.5h.01"]);
export const Layers = c(["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"]);
export const Layout = c(["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z", "M3 9h18", "M9 21V9"]);
export const LayoutDashboard = c(["M3 4h7v9H3zm11 0h7v5h-7zm0 9h7v7h-7zm-11 13h7v4H3z"]);
export const LayoutGrid = c(["M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zm-11 0h7v7H3z"]);
export const LayoutTemplate = Layout;
export const Link = c(["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]);
export const Link2 = Link;
export const ListOrdered = c(["M10 6h11", "M10 12h11", "M10 18h11", "M4 6h1", "M4 12h1", "M4 18h1"]);
export const ListPlus = c(["M11 12H3", "M16 6H3", "M16 18H3", "M19 10v6", "M16 13h6"]);
export const Loader2 = c(["M21 12a9 9 0 1 1-9-9"]);
export const Lock = c(["M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z", "M7 11V7a5 5 0 0 1 10 0v4"]);
export const LogOut = c(["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]);
export const Mail = c(["M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M22 7l-10 7L2 7"]);
export const MapPin = c(["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]);
export const Maximize2 = c(["M15 3h6v6", "M9 21H3v-6", "M21 3l-7 7", "M3 21l7-7"]);
export const Menu = c(["M3 12h18", "M3 6h18", "M3 18h18"]);
export const MessageSquare = React.forwardRef<SVGSVGElement, any>(({ size, strokeWidth = 1.5, className = '', ...props }, ref) => {
  const hasSize = className && /\b(w-\d+|w-\[.*?\]|size-\d+|size-\[.*?\]|h-\d+|h-\[.*?\])\b/.test(className);
  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      width={size || "24"}
      height={size || "24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={hasSize ? className : `w-5 h-5 ${className}`}
      {...props}
    >
      <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" strokeMiterlimit="10" />
      <path d="M7 8H17" />
      <path d="M7 13H13" />
    </svg>
  );
});
export const MessageCircle = MessageSquare;
export const MessageSquareShare = c(["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "M12 11V7l4 4", "M12 7l-4 4 4-4"]);
export const Mic = c(["M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v4", "M8 23h8"]);
export const MicOff = c(["M1 1l22 22", "M9 9v3a3 3 0 0 0 5.12 2.12", "M15 9.34V4a3 3 0 0 0-5.94-.6", "M17 11.5a7 7 0 0 1-12 0", "M12 19v4", "M8 23h8"]);
export const Minimize2 = c(["M4 14h6v6", "M20 10h-6V4", "M14 10l7-7", "M10 14l-7 7"]);
export const Minus = c(["M5 12h14"]);
export const Monitor = c(["M2 4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z", "M8 21h8", "M12 17v4"]);
export const Moon = c(["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"]);
export const MoreHorizontal = c(["M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"]);
export const MoreVertical = c(["M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0", "M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"]);
export const MousePointer2 = c(["M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z", "M13 13l6 6"]);
export const MoveDown = ArrowDown;
export const MoveUp = ArrowUp;
export const Music = c(["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", "M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"]);
export const Newspaper = c(["M4 4h16v16H4V4z", "M8 8h8", "M8 12h8", "M8 16h4"]);
export const Package = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8"]);
export const PackageCheck = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8", "M9 12l2 2 4-4"]);
export const PackageOpen = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8", "M8 5l8 5"]);
export const PackageSearch = c(["M21 16V8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8", "M15 15l4 4"]);
export const Paperclip = c(["M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"]);
export const Pause = c(["M6 4h4v16H6z", "M14 4h4v16h-4z"]);
export const Pen = Edit;
export const Percent = c(["M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M19 5L5 19"]);
export const Phone = c(["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"]);
export const PhoneCall = Phone;
export const PhoneOff = c(["M1 1l22 22", "M16.74 16.74a16.37 16.37 0 0 1-8.11-4.63 16.37 16.37 0 0 1-4.63-8.11M4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81L8.09 8.09M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-3.07-.48", "M14 14l3-3a2 2 0 0 1 2.11-.45c.95.27 1.89.5 2.81.7a2 2 0 0 1 1.72 2v3"]);
export const Pin = c(["M12 17v5", "M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.12-2.65A2 2 0 0 1 16 10.12V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v5.12c0 .4-.12.8-.36 1.11L5.44 14a2 2 0 0 0-.44 1.24V17z"]);
export const PinOff = Pin;
export const Play = c(["M5 3l14 9-14 9V3z"]);
export const Plus = c(["M12 5v14", "M5 12h14"]);
export const Presentation = c(["M2 4h20v14H2z", "M12 18v4", "M4 22h16", "M6 8l4 4M10 8l4 4"]);
export const QrCode = c(["M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zm-11 0h7v7H3z", "M7 17h.01", "M17 17h.01", "M17 7h.01", "M7 7h.01"]);
export const Radio = c(["M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"]);
export const RefreshCw = c(["M23 4v6h-6M1 20v-6h6", "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]);
export const RotateCcw = c(["M1 4v6h6", "M3.51 15a9 9 0 1 0 2.13-9.36L1 10"]);
export const RotateCw = c(["M23 4v6h-6", "M20.49 15a9 9 0 1 1-2.12-9.36L23 10"]);
export const Save = c(["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z", "M17 21v-8H7v8", "M7 3v5h8V3"]);
export const Scissors = c(["M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M9.8 8.2L20 17", "M9.8 15.8L20 7"]);
export const Search = c(["M11.5 18a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z", "M16 16l5 5"]);
export const Send = c(["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"]);
export const Settings = c(["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"]);
export const Share2 = c(["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M8.59 13.51l6.83 3.98", "M15.41 6.51L8.59 10.49"]);
export const Shield = c(["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]);
export const ShieldAlert = Shield;
export const ShieldCheck = c(["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 11l2 2 4-4"]);
export const ShoppingCart = React.forwardRef<SVGSVGElement, any>(({ size, strokeWidth = 1.5, className = '', ...props }, ref) => {
  const hasSize = className && /\b(w-\d+|w-\[.*?\]|size-\d+|size-\[.*?\]|h-\d+|h-\[.*?\])\b/.test(className);
  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      width={size || "24"}
      height={size || "24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={hasSize ? className : `w-5 h-5 ${className}`}
      {...props}
    >
      <path d="M6 19.5001h9.92c0.3546 0.0002 0.6979 -0.1252 0.9689 -0.3541 0.2709 -0.2288 0.452 -0.5462 0.5111 -0.8959L20 2.75007c0.0601 -0.35658 0.2471 -0.67943 0.5264 -0.90911 0.2793 -0.22969 0.6321 -0.35075 0.9936 -0.34089h1" />
      <path d="M7.81396 22.5098c-0.2071 0 -0.375 -0.1679 -0.375 -0.375s0.1679 -0.375 0.375 -0.375" />
      <path d="M7.81396 22.5098c0.20711 0 0.375 -0.1679 0.375 -0.375s-0.16789 -0.375 -0.375 -0.375" />
      <path d="M15.3848 22.5098c-0.2071 0 -0.375 -0.1679 -0.375 -0.375s0.1679 -0.375 0.375 -0.375" />
      <path d="M15.3848 22.5098c0.2071 0 0.375 -0.1679 0.375 -0.375s-0.1679 -0.375 -0.375 -0.375" />
      <path d="M18.0002 15H5.88022c-0.6635 -0.0066 -1.30609 -0.233 -1.82721 -0.6437 -0.52112 -0.4108 -0.89136 -0.9827 -1.05279 -1.6263l-1.48 -5.8c-0.02516 -0.11041 -0.02566 -0.22501 -0.00146 -0.33563 0.0242 -0.11063 0.0725 -0.21455 0.14146 -0.30437 0.06987 -0.08997 0.15931 -0.16284 0.26154 -0.21309 0.10222 -0.05025 0.21455 -0.07655 0.32846 -0.07691H19.4802" />
      <path d="m18.0003 6.00029 -3.75 -3.75c-0.3539 -0.35052 -0.8319 -0.54717 -1.33 -0.54717 -0.4981 0 -0.9761 0.19665 -1.33 0.54717l-3.74997 3.75" />
      <path d="m10.51 3.33986 -4.4 -1.29c-0.23571 -0.07035 -0.48302 -0.09325 -0.72764 -0.06737 -0.24461 0.02588 -0.48167 0.10002 -0.69743 0.21814 -0.21577 0.11811 -0.40597 0.27785 -0.55958 0.46997 -0.15362 0.19211 -0.2676 0.41279 -0.33535 0.64926l-0.79 2.68" />
    </svg>
  );
});
export const ShoppingBag = ShoppingCart;
export const Sliders = c(["M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h6M10 8h4M18 16h4"]);
export const SlidersHorizontal = Sliders;
export const Smartphone = c(["M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4z", "M12 18h.01"]);
export const Sparkles = c(["M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z", "M6 3l.5 2 2 .5-2 .5L6 8l-.5-2-2-.5 2-.5z"]);
export const SquareStack = c(["M4 4h16v16H4V4z", "M9 1h11a2 2 0 0 1 2 2v11"]);
export const Star = c(["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"]);
export const Store = c(["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z", "M9 14h6v8H9z"]);
export const Sun = c(["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 1v2", "M12 21v2", "M4.22 4.22l1.42 1.42", "M18.36 18.36l1.42 1.42", "M1 12h2", "M21 12h2", "M4.22 19.78l1.42-1.42", "M18.36 5.64l1.42-1.42"]);
export const Tag = c(["M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z", "M7 7h.01"]);
export const Ticket = c(["M1.5 8.5C1.5 7.67 2.17 7 3 7h18c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H3c-.83 0-1.5-.67-1.5-1.5v-7z", "M10 7a2 2 0 0 0 0 4 2 2 0 0 0 0-4zm4 0a2 2 0 0 0 0 4 2 2 0 0 0 0-4z"]);
export const Torus = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]);
export const Trash = c(["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"]);
export const Trash2 = Trash;
export const TrendingUp = c(["M23 6L13.5 15.5l-5-5L1 18", "M17 6h6v6"]);
export const Truck = c(["M1 3h15v13H1V3zm15 5h4l3 3v5h-7V8z", "M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"]);
export const User = c(["M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M5 21a7 7 0 0 1 14 0"]);
export const UserMinus = c(["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14.5 0h-6"]);
export const UserPlus = c(["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm11.5-3v6", "M17 11h6"]);
export const UserX = c(["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9.5-3l4 4", "M22 8l-4 4"]);
export const Users = c(["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M17 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87"]);
export const Users2 = Users;
export const Video = c(["M23 7l-7 5 7 5V7z", "M1 5h15v14H1V5z"]);
export const VideoOff = c(["M1 1l22 22", "M23 7l-7 5 7 5V7z", "M1 5h15v14H1V5z"]);
export const Volume2 = c(["M11 5L6 9H2v6h4l5 4V5z", "M15.54 8.46a5 5 0 0 1 0 7.07", "M19.07 4.93a10 10 0 0 1 0 14.14"]);
export const VolumeX = c(["M11 5L6 9H2v6h4l5 4V5z", "M23 9l-6 6", "M17 9l6 6"]);
export const Wallet = c(["M20 12V8H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12v4", "M4 6v12a2 2 0 0 0 2 2h14v-4", "M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z"]);
export const Wifi = c(["M5 12.55a11 11 0 0 1 14.08 0", "M1.42 9a16 16 0 0 1 21.16 0", "M8.53 16.11a6 6 0 0 1 6.95 0", "M12 20h.01"]);
export const WifiOff = c(["M1 1l22 22", "M5 12.55a11 11 0 0 1 14.08 0", "M1.42 9a16 16 0 0 1 21.16 0", "M8.53 16.11a6 6 0 0 1 6.95 0", "M12 20h.01"]);
export const X = c(["M18 6L6 18", "M6 6l12 12"]);
export const XCircle = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M15 9l-6 6", "M9 9l6 6"]);
export const XIcon = X;
export const Zap = c(["M13 2L3 14h9l-1 8 10-12h-9z"]);
export const ZoomIn = c(["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M21 21l-4.35-4.35", "M11 8v6", "M8 11h6"]);
export const ZoomOut = c(["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M21 21l-4.35-4.35", "M8 11h6"]);

// Add fallbacks and aliases for all possible package naming variants
export const MessageCircleShare = MessageSquareShare;
export const CircleDollarSignIcon = CircleDollarSign;
export const InfoCircle = Info;
export const PlusCircle = AlertCircle;
export const ShoppingCredits = ShoppingBag;
export const ShieldAlertIcon = ShieldAlert;
export const KeyRoundIcon = KeyRound;
export const StarIcon = Star;
export const PhoneCallIcon = PhoneCall;
export const AlertCircleIcon = AlertCircle;
export const ArrowRightLeft = ArrowLeftRight;
export const SparklesIcon = Sparkles;
export const GiftIcon = Gift;
export const LayoutGridIcon = LayoutGrid;
export const LayersIcon = Layers;
export const ClockIcon = Clock;
export const Trash2Icon = Trash2;
export const EditIcon = Edit;
export const PlusIcon = Plus;
export const PackageCheckIcon = PackageCheck;
export const PackageOpenIcon = PackageOpen;
export const XCircleIcon = XCircle;
export const UserIcon = User;
export const TicketIcon = Ticket;
export const CoinsIcon = Coins;
export const WalletIcon = Wallet;
export const MapPinIcon = MapPin;
export const BellIcon = Bell;
export const PhoneIcon = Phone;
export const SendIcon = Send;
export const ImageIcon = Image;
export const LockIcon = Lock;
export const MailIcon = Mail;
export const SearchIcon = Search;
export const CheckIconCustom = Check;
export const CrossIcon = X;
export const HistoryIcon = History;
export const Users2Icon = Users2;
export const BikeIcon = Bike;
export const BookOpenIcon = BookOpen;
export const NewspaperIcon = Newspaper;
export const StoreIcon = Store;
export const ArrowLeftIcon = ArrowLeft;
export const ArrowRightIcon = ArrowRight;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const CopyIcon = Copy;
export const Share2Icon = Share2;
export const AlertTriangleIcon = AlertTriangle;
export const PlayIcon = Play;
export const PauseIcon = Pause;
export const Volume2Icon = Volume2;
export const VolumeXIcon = VolumeX;
export const MicIcon = Mic;
export const MicOffIcon = MicOff;
export const VideoIcon = Video;
export const VideoOffIcon = VideoOff;
export const RefreshCwIcon = RefreshCw;
export const ZapIcon = Zap;
export const AwardIcon = Award;
export const CrownIcon = Crown;
export const DiamondIcon = Diamond;
export const BotIcon = Bot;
export const ActivityIcon = Activity;
export const BoxIcon = Box;
export const FileTextIcon = FileText;
export const SettingsIcon = Settings;
export const LogOutIcon = LogOut;
export const ChevronLeftSquare = ChevronLeft;
export const CornerUpLeftIcon = CornerUpLeft;
export const ForwardIcon = Forward;
export const Minimize2Icon = Minimize2;
export const Maximize2Icon = Maximize2;
export const SearchIconCustom = Search;
export const CheckCircleIcon = CheckCircle;
export const PinIcon = Pin;
export const PinOffIcon = PinOff;
export const MoreVerticalIcon = MoreVertical;
export const MoreHorizontalIcon = MoreHorizontal;
export const TrashIcon = Trash;
export const UserPlusIcon = UserPlus;
export const UserMinusIcon = UserMinus;
export const UserXIcon = UserX;
export const ClipboardIcon = Clipboard;
export const ClipboardListIcon = ClipboardList;
export const LinkIcon = Link;
export const Link2Icon = Link2;
export const ExternalLinkIcon = ExternalLink;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeOff;
export const FilmIcon = Film;
export const PresentationIcon = Presentation;
export const QrCodeIcon = QrCode;
export const RadioIcon = Radio;
export const RotateCcwIcon = RotateCcw;
export const RotateCwIcon = RotateCw;
export const SlidersIcon = Sliders;
export const SlidersHorizontalIcon = SlidersHorizontal;
export const SmartphoneIcon = Smartphone;
export const TorusIcon = Torus;
export const TrendingUpIcon = TrendingUp;
export const TruckIcon = Truck;
export const WifiIcon = Wifi;
export const WifiOffIcon = WifiOff;
export const ZoomInIcon = ZoomIn;
export const ZoomOutIcon = ZoomOut;
export const StarHalf = Star;
export const StarHalfIcon = Star;
export const PackageSearchIcon = PackageSearch;
export const PackageCheck2 = PackageCheck;
export const CheckCheckIcon = CheckCheck;
export const CheckCircle2Icon = CheckCircle2;
export const Clock3 = Clock;
export const ArrowLeftRightIcon = ArrowLeftRight;
export const SparklesIconCustom = Sparkles;
export const HelpCircleIcon = HelpCircle;
export const StarFill = Star;
export const StarOutline = Star;
export const ShoppingBagIcon = ShoppingBag;
export const ShoppingCartIcon = ShoppingCart;
export const HomeIconCustom = Home;
export const StarOutlineIcon = Star;
export const StarFillIcon = Star;
export const ShieldCheckIcon = ShieldCheck;
export const ShieldAlertIconCustom = ShieldAlert;
export const MenuIcon = Menu;
export const RefreshCwIconCustom = RefreshCw;
export const AtSignIcon = AtSign;
export const PaperclipIcon = Paperclip;
export const RotateCcwIconCustom = RotateCcw;
export const RotateCwIconCustom = RotateCw;

// Added icons for chat experience
export const Undo2 = c(["M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"]);
export const Eraser = c(["m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21", "M22 21H7", "m5 11 9 9"]);
export const Palette = c(["M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8h1a2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a5 5 0 0 0 5-5c0-5-4.03-9-9-9z", "M7.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M16.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"]);
export const MessageSquareMore = c(["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "M8 10h.01", "M12 10h.01", "M16 10h.01"]);
export const Pencil = c(["M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z", "m15 5 4 4"]);
export const Smile = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01", "M15 9h.01"]);
export const BellOff = c(["M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5", "M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7", "M10.3 21a1.94 1.94 0 0 0 3.4 0", "m2 2 20 20"]);
export const Ban = c(["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "m4.93 4.93 14.14 14.14"]);
export const MessageSquareWarning = c(["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "M12 7v3", "M12 13h.01"]);
