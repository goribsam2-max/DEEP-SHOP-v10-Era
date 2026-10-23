import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Newspaper, 
  BarChart3, 
  X, 
  ChevronRight, 
  ShieldAlert, 
  Settings, 
  Sun, 
  Moon, 
  ArrowRight 
} from 'lucide-react';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: any;
}

export const NewsHubDrawer: React.FC<NewsHubDrawerProps> = ({ isOpen, onClose, userData }) => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const displayName = userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const photoURL = userData?.photoURL || currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-10 text-zinc-900 dark:text-zinc-100 overflow-y-auto"
          >
            {/* Header / Profile info */}
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  News Hub Menu
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User preview */}
              <div 
                onClick={() => handleNav('/profile')}
                className="flex items-center gap-3 p-2 -mx-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate">
                    {displayName}
                  </h4>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <span>Creator Profile</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>

            {/* PRIMARY 3 NAVIGATION BUTTONS (HOME, FEED, DASHBOARD) */}
            <div className="p-4 space-y-2 border-b border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 block mb-1">
                Main Hub
              </span>

              {/* 1. HOME */}
              <button
                type="button"
                onClick={() => handleNav('/')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer font-bold text-sm text-zinc-800 dark:text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                  <span>HOME</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* 2. FEED */}
              <button
                type="button"
                onClick={() => handleNav('/news-hub')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-extrabold text-sm shadow-xs transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-black/10 flex items-center justify-center">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <span>FEED (Active)</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </button>

              {/* 3. DASHBOARD */}
              <button
                type="button"
                onClick={() => handleNav('/creator-dashboard')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm shadow-md hover:opacity-95 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">DASHBOARD</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <span>Open</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            </div>

            {/* CREATOR SHORTCUTS (Clean without monetization or star perks) */}
            <div className="p-4 space-y-1.5 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 block mb-1">
                Tools & Community
              </span>

              <button
                type="button"
                onClick={() => handleNav('/news-hub/create')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report Scam / Expose Fraud</span>
                </div>
                <span className="text-[10px] font-bold">+ New</span>
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 dark:hidden text-amber-500" />
                  <Moon className="w-4 h-4 hidden dark:inline text-blue-400" />
                  <span>Switch Theme</span>
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono">Toggle</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('/settings')}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings & Account</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewsHubDrawer;
