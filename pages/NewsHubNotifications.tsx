import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { subscribeToWebPush } from '../lib/push';

interface NewsNotification {
  id: string;
  type: 'follow' | 'star' | 'sponsor' | 'comment' | 'evidence' | 'system';
  title: string;
  body: string;
  avatarText?: string;
  avatarBg?: string;
  date: string;
  read: boolean;
  link?: string;
}

export const NewsHubNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);
  const [notifications, setNotifications] = useState<NewsNotification[]>([]);
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Preference toggles
  const [prefs, setPrefs] = useState({
    comments: true,
    follows: true,
    stars: true,
    scamAlerts: true,
  });

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await window.Notification.requestPermission();
        if (res === 'granted' && user?.uid) {
          subscribeToWebPush(user.uid);
        }
      } catch (e) {
        console.warn('Push permission error:', e);
      }
    }
  };

  useEffect(() => {
    // Dismiss tooltip after 6 seconds automatically or on interaction
    const timer = setTimeout(() => setShowSettingsTooltip(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        if (user) {
          const q = query(
            collection(db, 'news_hub_notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          const loaded: NewsNotification[] = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
            date: d.data().createdAt ? new Date(d.data().createdAt.toDate?.() || d.data().createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'
          }));

          setNotifications(loaded);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NewsNotification) => {
    // If permission is not granted, trigger the prompt logic
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission !== 'granted') {
       window.dispatchEvent(new CustomEvent('showNotificationPrompt'));
    }

    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 relative">
      {/* Top subtle blue fade gradient glow per user specification */}
      <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-600/15 dark:via-blue-600/5 dark:to-transparent" />

      {/* Top Header bar spanning full width */}
      <header className="sticky top-0 z-20 w-full bg-white dark:bg-black border-b border-slate-100 dark:border-zinc-900 shadow-sm">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-200 cursor-pointer"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications
          </h1>

          <div className="relative">
            <button
              onClick={() => {
                setShowSettingsTooltip(false);
                setShowPreferencesModal(true);
              }}
              aria-label="Customize notifications"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-200 cursor-pointer"
            >
              <Icon name="cog" className="w-5 h-5" />
            </button>

            {/* Mockup Tooltip: Customize your notifications! */}
            {showSettingsTooltip && (
              <div 
                onClick={() => {
                  setShowSettingsTooltip(false);
                  setShowPreferencesModal(true);
                }}
                className="absolute right-0 top-12 z-30 cursor-pointer animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="relative bg-slate-950 dark:bg-zinc-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-slate-800">
                  <div className="absolute -top-1.5 right-3 w-3 h-3 bg-slate-950 dark:bg-zinc-900 rotate-45 border-l border-t border-slate-800" />
                  Customize your notifications!
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full flex flex-col relative px-4 pb-12">

        {/* Content Area */}
        <main className="flex-1 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            /* Empty State matching Mockup */
            <div className="flex flex-col items-center justify-center text-center py-20 px-6">
              {/* Cute Mailbox SVG illustration matching mockup */}
              <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
                <svg viewBox="0 0 120 120" className="w-28 h-28 drop-shadow-md" fill="none">
                  {/* Stand */}
                  <rect x="56" y="70" width="8" height="40" rx="4" fill="#6366F1" />
                  {/* Mailbox Body with blue-indigo gradient */}
                  <defs>
                    <linearGradient id="mailGrad" x1="20" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3B82F6" />
                      <stop offset="1" stopColor="#6366F1" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M30 40C30 26.7452 40.7452 16 54 16H80C86.6274 16 92 21.3726 92 28V70H30V40Z" 
                    fill="url(#mailGrad)" 
                  />
                  {/* Flag post & Red Flag */}
                  <path d="M78 28V12H88V20H78" fill="#EF4444" />
                  <rect x="76" y="10" width="4" height="24" rx="2" fill="#DC2626" />
                  {/* Front door shadow */}
                  <path d="M30 40C30 26.7452 40.7452 16 54 16V70H30V40Z" fill="#2563EB" opacity="0.4" />
                  {/* Checkmark inside white circle on door */}
                  <circle cx="48" cy="46" r="12" fill="white" fillOpacity="0.25" />
                  <path d="M43 46L47 50L54 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No notifications yet
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xs mb-8">
                Your notification will appear here once you've received them.
              </p>

              <div className="text-xs text-slate-400">
                <span>Missing notifications? </span>
                <button 
                  onClick={() => setShowPreferencesModal(true)}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Go to notification settings.
                </button>
              </div>
            </div>
          ) : (
            /* Notification Cards matching Mockup */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Previously
                </span>
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      !item.read
                        ? 'bg-slate-50 dark:bg-zinc-900/90 border-blue-200 dark:border-blue-900/50 shadow-sm'
                        : 'bg-white dark:bg-zinc-900/40 border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar initial/icon */}
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${item.avatarBg || 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'}`}>
                        {item.avatarText || 'N'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                            {item.title}
                          </h3>
                          <span className="text-xs text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                            {item.date}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {item.body}
                        </p>
                      </div>

                      {/* Blue unread indicator dot matching mockup */}
                      {!item.read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom footer link */}
              <div className="text-center pt-8 pb-4">
                <span className="text-xs text-slate-400">Missing notifications? </span>
                <button
                  onClick={() => setShowPreferencesModal(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline block mx-auto mt-1"
                >
                  Go to notification settings.
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Preferences Modal (Matches Mockup Screen 1: "Get notified about important stuff") */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Get notified about important stuff
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3">
              We'll notify you when
            </p>

            {/* Checklist Box matching mockup card */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-700/50 space-y-3">
              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon name="message-square" className="w-5 h-5 text-slate-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200">
                    Your comments or evidence get replied to
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.comments}
                  onChange={e => setPrefs({ ...prefs, comments: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon name="star" className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200">
                    You receive Stars or creator sponsorship
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.stars}
                  onChange={e => setPrefs({ ...prefs, stars: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon name="user-plus" className="w-5 h-5 text-blue-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200">
                    Someone follows your scam alerts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.follows}
                  onChange={e => setPrefs({ ...prefs, follows: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between pt-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Icon name="shield-alert" className="w-5 h-5 text-rose-500" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200">
                    Critical scam alerts in your tagged category
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.scamAlerts}
                  onChange={e => setPrefs({ ...prefs, scamAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-4 mb-6">
              You can adjust these settings later.
            </p>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="py-3 px-4 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => {
                  requestPushPermission();
                  setShowPreferencesModal(false);
                }}
                className="py-3 px-4 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-slate-900 transition-colors cursor-pointer"
              >
                Get notified
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NewsHubNotifications;
