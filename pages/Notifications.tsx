import React, { useState, useEffect, useMemo, useRef } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Notification, UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import { useFullScreenInfo, useNotify } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import { subscribeToWebPush } from "../lib/push";
import { isLoopsNotification } from "../lib/shopNotificationFilter";
import { optimizeImageUrl } from "../lib/imageOptimize";
import {
  Settings,
  Bell,
  Ticket,
  CheckCircle2,
  MessageSquareWarning,
  Percent,
  Check,
  Mail,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";

interface NotificationPrefs {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  updateApplication: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailNotifications: true,
  inAppNotifications: true,
  updateApplication: false,
};

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === "number") return Number.isFinite(ts) ? ts : 0;
  if (ts instanceof Date) {
    const t = ts.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof ts?.toMillis === "function") {
    const t = ts.toMillis();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof ts?.toDate === "function") {
    const d = ts.toDate();
    const t = d instanceof Date ? d.getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof ts === "object" && typeof ts.seconds === "number") {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
  }
  if (typeof ts === "string") {
    const parsed = new Date(ts).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatClockTime(ts?: any, includeDate = false): string {
  const ms = toMillis(ts);
  if (!ms) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!includeDate) return timeStr;
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} • ${timeStr}`;
}

function getNotificationCategoryStyle(notif: Notification): {
  circleClass: string;
  icon: React.ReactNode;
} {
  const combined = `${notif.title || ""} ${notif.message || ""} ${notif.type || ""} ${
    notif.variant || ""
  }`.toLowerCase();

  if (
    combined.includes("security") ||
    combined.includes("device") ||
    combined.includes("spot") ||
    combined.includes("reject") ||
    combined.includes("cancel") ||
    combined.includes("warn") ||
    combined.includes("return")
  ) {
    return {
      circleClass: "bg-[#FF9500]/12 text-[#C93400] dark:text-[#FF9F0A]",
      icon: <MessageSquareWarning className="w-5 h-5" />,
    };
  }

  if (
    combined.includes("success") ||
    combined.includes("approv") ||
    combined.includes("deliver") ||
    combined.includes("ship") ||
    combined.includes("complete") ||
    combined.includes("order") ||
    combined.includes("purchase")
  ) {
    return {
      circleClass: "bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]",
      icon: <CheckCircle2 className="w-5 h-5" />,
    };
  }

  if (combined.includes("ticket") || combined.includes("support")) {
    return {
      circleClass: "bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text",
      icon: <Ticket className="w-5 h-5" />,
    };
  }

  return {
    circleClass: "bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text",
    icon: <Percent className="w-5 h-5" />,
  };
}

const AppleSwitch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        triggerHaptic();
        onChange(!checked);
      }}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
        checked ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-[#E5E5EA] dark:bg-[#3A3A3C]"
      }`}
    >
      <motion.span
        layout
        transition={APPLE_SPRING_SNAPPY}
        className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm ${
          checked ? "ml-auto" : "mr-auto"
        }`}
      />
    </button>
  );
};

const NotificationRow: React.FC<{
  notification: Notification;
  isTodaySection: boolean;
  onSelect: () => void;
  onToggleRead: () => void;
  onDismiss: () => void;
}> = ({ notification, isTodaySection, onSelect, onToggleRead, onDismiss }) => {
  const { circleClass, icon } = getNotificationCategoryStyle(notification);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchRef = useRef<{
    startX: number;
    startY: number;
    axis: "x" | "y" | null;
    hapticTicked: boolean;
  } | null>(null);
  const didSwipeRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX <= 26) return;
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      axis: null,
      hapticTicked: false,
    };
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const s = touchRef.current;
    if (!s || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;

    if (!s.axis) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
        s.axis = "y";
        touchRef.current = null;
        return;
      }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        s.axis = "x";
        setIsDragging(true);
        didSwipeRef.current = true;
      } else {
        return;
      }
    }

    const clamped = Math.max(-96, Math.min(88, dx));
    if (!s.hapticTicked && Math.abs(clamped) >= 60) {
      s.hapticTicked = true;
      triggerHaptic("selection");
    }
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    const s = touchRef.current;
    touchRef.current = null;
    setIsDragging(false);
    if (!s || s.axis !== "x") return;

    if (offsetX >= 60) {
      triggerHaptic("selection");
      setOffsetX(0);
      onToggleRead();
      return;
    }
    if (offsetX <= -64) {
      triggerHaptic("medium");
      setOffsetX(0);
      onDismiss();
      return;
    }
    setOffsetX(0);
  };

  const headline =
    notification.title && notification.message
      ? `${notification.title}: ${notification.message}`
      : notification.title || notification.message || "New notification";

  return (
    <div
      data-no-swipe="true"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Left Reveal: Toggle Read/Unread */}
      <div
        className={`absolute inset-y-0 left-0 w-24 flex items-center justify-center rounded-l-2xl bg-[#0071E3] text-white text-xs font-bold transition-opacity ${
          offsetX > 6 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          {notification.isRead ? (
            <Mail className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4 stroke-[2.5]" />
          )}
          <span>{notification.isRead ? "Unread" : "Read"}</span>
        </div>
      </div>

      {/* Right Reveal: Dismiss Notification */}
      <div
        className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center rounded-r-2xl bg-rose-500 text-white text-xs font-bold transition-opacity ${
          offsetX < -6 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Trash2 className="w-4 h-4" />
          <span>Dismiss</span>
        </div>
      </div>

      <div
        onClick={() => {
          if (didSwipeRef.current) {
            didSwipeRef.current = false;
            return;
          }
          triggerHaptic();
          onSelect();
        }}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging
            ? "none"
            : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative z-10 py-3.5 flex items-start gap-3.5 cursor-pointer rounded-2xl px-2 bg-white dark:bg-[#1C1C1E] hover:bg-black/[0.025] dark:hover:bg-white/[0.03] transition-colors"
      >
        {!notification.isRead && (
          <span
            aria-label="Unread"
            className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] shrink-0 mt-4"
          />
        )}

        {(() => {
          const notifImg = notification.image?.trim()
            ? optimizeImageUrl(notification.image.trim(), 112)
            : "";
          return (
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                notifImg ? "ds-apple-surface-subtle" : circleClass
              }`}
            >
              {notifImg ? (
                <img
                  src={notifImg}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                icon
              )}
            </div>
          );
        })()}

        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] sm:text-[14px] font-semibold leading-[1.38] line-clamp-3">
            {headline}
          </p>
          <span className="block text-[11.5px] font-medium ds-apple-muted mt-1 tabular-nums">
            {formatClockTime(notification.createdAt, !isTodaySection)}
          </span>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(
    () => auth.currentUser?.uid || null
  );
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    try {
      const saved = localStorage.getItem("vibe_notification_prefs_v2");
      if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PREFS;
  });

  const navigate = useNavigate();
  const fullScreenInfo = useFullScreenInfo();
  const notify = useNotify();
  const illustrations = useIllustrations();

  useEffect(() => {
    try {
      const key = `deepshop_dismissed_notifications_${currentUid || "guest"}`;
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      setDismissedIds(Array.isArray(saved) ? saved : []);
    } catch {
      setDismissedIds([]);
    }
  }, [currentUid]);

  const { swipeHandlers: notificationPageSwipeHandlers } = useSwipeNavigation({
    onSwipeLeft: () => {
      if (!showSettings) {
        triggerHaptic("selection");
        setShowSettings(true);
      }
    },
    onSwipeRight: () => {
      if (showSettings) {
        triggerHaptic("selection");
        setShowSettings(false);
      }
    },
    onEdgeSwipeRight: () => {
      triggerHaptic("light");
      if (showSettings) {
        setShowSettings(false);
      } else {
        navigate(-1);
      }
    },
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setCurrentUid(u?.uid || null);
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile & {
            notificationSettings?: Partial<NotificationPrefs>;
          };
          setUserProfile(data);
          if (data.notificationSettings) {
            setPrefs((prev) => ({ ...prev, ...data.notificationSettings }));
          }
        }
      } catch (err) {
        console.warn("Error loading profile for notifications:", err);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUid) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allNotifs = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Notification
        );

        const minRegTime = toMillis(
          userProfile?.registrationDate || userProfile?.createdAt
        );

        const filtered = allNotifs.filter((n) => {
          if (isLoopsNotification(n)) return false;
          if (n.userId === currentUid) return true;
          if (n.userId === "all") {
            if (!minRegTime) return true;
            return toMillis(n.createdAt) >= minRegTime - 60000;
          }
          return false;
        });

        setNotifications(filtered);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUid, userProfile?.registrationDate, userProfile?.createdAt]);

  const updatePreference = async (
    key: keyof NotificationPrefs,
    value: boolean
  ) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem("vibe_notification_prefs_v2", JSON.stringify(next));
    } catch {}

    if (key === "inAppNotifications" && value) {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification?.permission === "default"
      ) {
        subscribeToWebPush(currentUid || undefined).catch(() => {});
      }
    }

    if (currentUid) {
      try {
        await setDoc(
          doc(db, "users", currentUid),
          { notificationSettings: next },
          { merge: true }
        );
      } catch (err) {
        console.warn("Could not persist notification settings:", err);
      }
    }
    notify("Notification preference updated", "info");
  };

  const markAsRead = async (notif: Notification) => {
    if (!notif.isRead && notif.id) {
      try {
        await updateDoc(doc(db, "notifications", notif.id), { isRead: true });
      } catch {
        // Ignore permission issue on broadcast notifications if any
      }
    }

    if (
      notif.variant === "approved-affiliate" ||
      notif.title === "Affiliate Application Approved" ||
      notif.title === "Withdrawal Completed"
    ) {
      fullScreenInfo({
        title: notif.title,
        message: notif.message,
        type: "success",
        buttonText: "Awesome",
        onClose: () => {},
      });
      return;
    }

    if (
      notif.variant === "rejected-affiliate" ||
      notif.variant === "rejected-withdrawal" ||
      notif.title === "Affiliate Application Rejected" ||
      notif.title === "Withdrawal Rejected"
    ) {
      fullScreenInfo({
        title: notif.title,
        message: notif.message,
        type: "error",
        buttonText: "Understood",
        onClose: () => {},
      });
      return;
    }

    if (notif.link) {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification &&
        window.Notification.permission === "default"
      ) {
        window.dispatchEvent(new CustomEvent("showNotificationPrompt"));
      }
      navigate(notif.link);
    } else if (notif.type === "ticket") {
      navigate("/help-center");
    }
  };

  const markSectionAsRead = async (items: Notification[]) => {
    const unread = items.filter((n) => !n.isRead && n.id);
    if (unread.length === 0) {
      notify("All notifications in this section are already read", "info");
      return;
    }
    try {
      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, "notifications", n.id), { isRead: true })
        )
      );
      notify("Marked all as read", "success");
    } catch {
      // Optimistically mark in state if broadcast doc
      setNotifications((prev) =>
        prev.map((item) =>
          unread.some((u) => u.id === item.id) ? { ...item, isRead: true } : item
        )
      );
    }
  };

  const toggleReadStatus = async (notif: Notification) => {
    if (!notif.id) return;
    const nextRead = !notif.isRead;
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notif.id ? { ...item, isRead: nextRead } : item
      )
    );
    try {
      await updateDoc(doc(db, "notifications", notif.id), { isRead: nextRead });
    } catch {
      // Broadcast/system docs may be read-only in Firestore rules; keep local state optimistic
    }
    notify(nextRead ? "Marked as read" : "Marked as unread", "info");
  };

  const dismissNotification = (notif: Notification) => {
    if (!notif.id) return;
    setDismissedIds((prev) => {
      if (prev.includes(notif.id)) return prev;
      const next = [notif.id, ...prev].slice(0, 200);
      try {
        localStorage.setItem(
          `deepshop_dismissed_notifications_${currentUid || "guest"}`,
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });
    notify("Notification dismissed", "info");
  };

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !dismissedIds.includes(n.id)),
    [notifications, dismissedIds]
  );

  const { todayList, earlierList } = useMemo(() => {
    const nowStr = new Date().toDateString();
    const today: Notification[] = [];
    const earlier: Notification[] = [];

    visibleNotifications.forEach((n) => {
      const ms = toMillis(n.createdAt);
      const d = ms ? new Date(ms) : null;
      if (d && !Number.isNaN(d.getTime()) && d.toDateString() === nowStr) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { todayList: today, earlierList: earlier };
  }, [visibleNotifications]);

  return (
    <div
      {...notificationPageSwipeHandlers}
      className="ds-apple-shop-canvas min-h-screen pb-[120px] md:pb-14"
    >
      <div className="max-w-[560px] mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-3 mb-5 px-1">
          <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight truncate">
            {showSettings ? "Notification Settings" : "Notifications"}
          </h1>

          {showSettings ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowSettings(false);
              }}
              className="ds-apple-btn-primary px-4 h-8 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
              aria-label="Notification settings"
              className="ds-apple-icon-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
        {showSettings ? (
          <div>
            <p className="text-center text-[13px] leading-[1.6] ds-apple-muted px-2 sm:px-5 mb-6">
              Manage your notification preferences. We will still send security alerts or essential updates about your orders and account.
            </p>

            <div className="ds-apple-surface rounded-[22px] px-4 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5 pr-2">
                  <h2 className="text-[14.5px] font-semibold">
                    Email Notifications
                  </h2>
                  <p className="text-xs leading-snug ds-apple-muted">
                    Receive email summaries about your orders and account.
                  </p>
                </div>
                <AppleSwitch
                  label="Email notifications"
                  checked={prefs.emailNotifications}
                  onChange={(v) => updatePreference("emailNotifications", v)}
                />
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5 pr-2">
                  <h2 className="text-[14.5px] font-semibold">
                    In-App Notifications
                  </h2>
                  <p className="text-xs leading-snug ds-apple-muted">
                    Receive real-time alerts inside the application.
                  </p>
                </div>
                <AppleSwitch
                  label="In app notifications"
                  checked={prefs.inAppNotifications}
                  onChange={(v) => updatePreference("inAppNotifications", v)}
                />
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5 pr-2">
                  <h2 className="text-[14.5px] font-semibold">
                    App Updates
                  </h2>
                  <p className="text-xs leading-snug ds-apple-muted">
                    Be notified when new features and updates are available.
                  </p>
                </div>
                <AppleSwitch
                  label="Update application"
                  checked={prefs.updateApplication}
                  onChange={(v) => updatePreference("updateApplication", v)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Studio Neutral Info Banner */}
            <div className="ds-apple-surface rounded-[22px] p-4 flex items-center gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-semibold leading-tight">
                  Order &amp; Payment Verification
                </h2>
                <p className="ds-apple-muted text-[12px] leading-[1.45] mt-0.5">
                  Please note there may be a brief delay while verifying advance payments or updating courier tracking status.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="ds-apple-surface rounded-[22px] p-4 space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 py-1.5">
                    <div className="w-11 h-11 rounded-full ds-skeleton shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-4/5 rounded-full ds-skeleton" />
                      <div className="h-2.5 w-20 rounded-full ds-skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="ds-apple-surface rounded-[24px] py-16 px-6 text-center flex flex-col items-center">
                {illustrations.emptyNotifications ? (
                  <div className="w-40 h-40 mx-auto mb-4 rounded-[20px] overflow-hidden">
                    <img
                      src={illustrations.emptyNotifications}
                      alt="No notifications"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text flex items-center justify-center mb-4">
                    <Bell className="w-6 h-6" />
                  </div>
                )}
                <h3 className="text-[15.5px] font-semibold">
                  No notifications yet
                </h3>
                <p className="text-xs ds-apple-muted mt-1 max-w-[240px]">
                  Order updates, exclusive deals, and account alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {todayList.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="ds-apple-eyebrow ds-apple-muted text-[11px]">
                        Today
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          markSectionAsRead(todayList);
                        }}
                        className="ds-apple-accent-text text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="ds-apple-surface rounded-[22px] p-2 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {todayList.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isTodaySection={true}
                          onSelect={() => markAsRead(notif)}
                          onToggleRead={() => toggleReadStatus(notif)}
                          onDismiss={() => dismissNotification(notif)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {earlierList.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="ds-apple-eyebrow ds-apple-muted text-[11px]">
                        {todayList.length > 0 ? "Earlier" : "All Notifications"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          markSectionAsRead(earlierList);
                        }}
                        className="ds-apple-accent-text text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="ds-apple-surface rounded-[22px] p-2 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {earlierList.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isTodaySection={false}
                          onSelect={() => markAsRead(notif)}
                          onToggleRead={() => toggleReadStatus(notif)}
                          onDismiss={() => dismissNotification(notif)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
