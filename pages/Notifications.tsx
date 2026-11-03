import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

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
      circleClass: "notif-v2-avatar-amber",
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
      circleClass: "notif-v2-avatar-green",
      icon: <CheckCircle2 className="w-5 h-5" />,
    };
  }

  if (combined.includes("ticket") || combined.includes("support")) {
    return {
      circleClass: "notif-v2-avatar-red",
      icon: <Ticket className="w-5 h-5" />,
    };
  }

  return {
    circleClass: "notif-v2-avatar-red",
    icon: <Percent className="w-5 h-5" />,
  };
}

const CoralSwitch: React.FC<{
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
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer ${
        checked ? "notif-v2-switch-on" : "notif-v2-switch-off"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full shadow-xs transition-transform duration-200 ${
          checked
            ? "translate-x-6 notif-v2-thumb-on"
            : "translate-x-1 notif-v2-thumb-off"
        }`}
      />
    </button>
  );
};

const NotificationRow: React.FC<{
  notification: Notification;
  isTodaySection: boolean;
  onSelect: () => void;
}> = ({ notification, isTodaySection, onSelect }) => {
  const { circleClass, icon } = getNotificationCategoryStyle(notification);

  const headline =
    notification.title && notification.message
      ? `${notification.title}: ${notification.message}`
      : notification.title || notification.message || "New notification";

  return (
    <div
      onClick={onSelect}
      className="py-3.5 flex items-start gap-3.5 cursor-pointer rounded-2xl px-1.5 hover:bg-zinc-50/80 dark:hover:bg-white/[0.03] transition-colors"
    >
      {/* Unread Red Dot on Left matching IMG_5389 */}
      {!notification.isRead && (
        <span
          aria-label="Unread"
          className="w-2 h-2 rounded-full notif-v2-bell-badge shrink-0 mt-4"
        />
      )}

      {/* Circular Pastel Icon / Image Avatar */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
          notification.image ? "bg-zinc-100 dark:bg-zinc-800" : circleClass
        }`}
      >
        {notification.image ? (
          <img
            src={optimizeImageUrl(notification.image, 112)}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          icon
        )}
      </div>

      {/* Headline + Timestamp */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] sm:text-[14px] font-bold text-zinc-900 dark:text-zinc-100 leading-[1.38] line-clamp-3">
          {headline}
        </p>
        <span className="block text-[11.5px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">
          {formatClockTime(notification.createdAt, !isTodaySection)}
        </span>
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

  const { todayList, earlierList } = useMemo(() => {
    const nowStr = new Date().toDateString();
    const today: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((n) => {
      const ms = toMillis(n.createdAt);
      const d = ms ? new Date(ms) : null;
      if (d && !Number.isNaN(d.getTime()) && d.toDateString() === nowStr) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { todayList: today, earlierList: earlier };
  }, [notifications]);

  return (
    <div className="notif-v2-shell min-h-screen pb-[120px] md:pb-14">
      <div className="max-w-[560px] mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
        {showSettings ? (
          /* ================================================================
             NOTIFICATIONS SETTING VIEW (MATCHING IMG_5389 RIGHT SCREEN)
             ================================================================ */
          <div>
            {/* Top Bar */}
            <div className="flex items-center justify-between h-11 mb-6">
              <h1 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                Notifications setting
              </h1>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Descriptive Intro Paragraph */}
            <p className="text-center text-[13px] leading-[1.6] text-zinc-500 dark:text-zinc-400 px-2 sm:px-5 mb-8">
              In this section, you will be able to manage notifications. We will continue to send you notifications for security reasons or if we need to contact you about your account.
            </p>

            {/* 3 Persisted Setting Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <div className="py-5 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <h2 className="text-[14.5px] font-bold text-zinc-900 dark:text-white">
                    Email notifications
                  </h2>
                  <p className="text-[12.5px] leading-snug text-zinc-400 dark:text-zinc-500">
                    You will receive an email about any notification regularly.
                  </p>
                </div>
                <CoralSwitch
                  label="Email notifications"
                  checked={prefs.emailNotifications}
                  onChange={(v) => updatePreference("emailNotifications", v)}
                />
              </div>

              <div className="py-5 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <h2 className="text-[14.5px] font-bold text-zinc-900 dark:text-white">
                    In app notifications
                  </h2>
                  <p className="text-[12.5px] leading-snug text-zinc-400 dark:text-zinc-500">
                    You will receive a notification inside the application.
                  </p>
                </div>
                <CoralSwitch
                  label="In app notifications"
                  checked={prefs.inAppNotifications}
                  onChange={(v) => updatePreference("inAppNotifications", v)}
                />
              </div>

              <div className="py-5 flex items-center justify-between gap-4">
                <div className="space-y-1 pr-2">
                  <h2 className="text-[14.5px] font-bold text-zinc-900 dark:text-white">
                    Update application
                  </h2>
                  <p className="text-[12.5px] leading-snug text-zinc-400 dark:text-zinc-500">
                    You will receive a notification about update application.
                  </p>
                </div>
                <CoralSwitch
                  label="Update application"
                  checked={prefs.updateApplication}
                  onChange={(v) => updatePreference("updateApplication", v)}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================
             NOTIFICATIONS LIST VIEW (MATCHING IMG_5389 LEFT SCREEN)
             ================================================================ */
          <div>
            {/* Top Bar (No duplicate back button since Shop header provides one) */}
            <div className="flex items-center justify-between h-11 mb-5">
              <h1 className="text-[19px] font-bold text-zinc-900 dark:text-white tracking-tight">
                Notifications
              </h1>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="Notifications setting"
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <Settings className="w-[21px] h-[21px] stroke-[1.8]" />
              </button>
            </div>

            {/* Soft Coral/Pink Information Banner (IMG_5389) */}
            <div className="notif-v2-info-banner rounded-[20px] p-4 flex items-center gap-3.5 mb-6">
              <div className="notif-v2-bell-badge w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-bold text-zinc-900 dark:text-white leading-tight">
                  Information!
                </h2>
                <p className="notif-v2-coral-text text-[12px] leading-[1.45] mt-0.5 font-medium">
                  Please note that there might be a brief delay while verifying advance payments or updating courier tracking status.
                </p>
              </div>
            </div>

            {/* Content States */}
            {loading ? (
              <div className="space-y-4 pt-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 py-2">
                    <div className="w-11 h-11 rounded-full ds-skeleton shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-4/5 rounded-full ds-skeleton" />
                      <div className="h-2.5 w-20 rounded-full ds-skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                {illustrations.emptyNotifications ? (
                  <div className="w-40 h-40 mx-auto mb-4 rounded-[20px] overflow-hidden">
                    <img
                      src={illustrations.emptyNotifications}
                      alt="No notifications"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full notif-v2-avatar-red flex items-center justify-center mb-4">
                    <Bell className="w-6 h-6" />
                  </div>
                )}
                <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">
                  No notifications yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
                  Order updates, exclusive deals, and account alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {todayList.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">
                        Today
                      </h2>
                      <button
                        type="button"
                        onClick={() => markSectionAsRead(todayList)}
                        className="notif-v2-coral-text text-[12.5px] font-semibold hover:opacity-80 transition cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-100/70 dark:divide-zinc-800/50">
                      {todayList.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isTodaySection={true}
                          onSelect={() => markAsRead(notif)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {earlierList.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">
                        {todayList.length > 0 ? "Earlier" : "All Notifications"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => markSectionAsRead(earlierList)}
                        className="notif-v2-coral-text text-[12.5px] font-semibold hover:opacity-80 transition cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-100/70 dark:divide-zinc-800/50">
                      {earlierList.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isTodaySection={false}
                          onSelect={() => markAsRead(notif)}
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
