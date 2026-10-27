import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { useNotify } from '../Notifications';
import { subscribeToWebPush } from '../../lib/push';
import { LiquidGlassPopup } from './liquid-glass-popup';

export function NotificationPermissionModal() {
  const [open, setOpen] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const permission = window.Notification.permission;
      const hasDismissed = localStorage.getItem('notificationPromptDismissed');
      
      if (permission === 'granted') {
        const ensureSubscribed = async () => {
          if (localStorage.getItem('vibe_push_enabled') !== 'true') {
            const result: any = await subscribeToWebPush(auth.currentUser?.uid);
            if (result && !result.error) {
              localStorage.setItem('vibe_push_enabled', 'true');
            }
          }
        };
        ensureSubscribed();
      } else if (permission === 'default' && !hasDismissed) {
        const timer = setTimeout(() => {
          setOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    const handleManualPrompt = () => {
      setOpen(true);
    };
    window.addEventListener('showNotificationPrompt', handleManualPrompt);
    return () => {
      window.removeEventListener('showNotificationPrompt', handleManualPrompt);
    };
  }, []);

  const handleAllow = async () => {
    try {
      const result: any = await subscribeToWebPush(auth.currentUser?.uid);
      if (result && !result.error) {
        localStorage.setItem('vibe_push_enabled', 'true');
        notify('Push notifications enabled!', 'success');
        fetch('/api/send-welcome-push', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: result })
        }).catch(e => console.error("Welcome push error:", e));
      } else {
        notify(result?.error || 'Permission denied or failed to setup. You can change this in your browser settings.', 'error');
        localStorage.setItem('notificationPromptDismissed', 'true');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    } finally {
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPromptDismissed', 'true');
    setOpen(false);
  };

  return (
    <LiquidGlassPopup
      open={open}
      onClose={handleDismiss}
      zIndexClass="z-[100000]"
      title="Enable notifications?"
      description="Get real-time updates about your orders, messages, and exclusive offers directly on your device."
      primaryText="Allow notifications"
      onPrimary={handleAllow}
      secondaryText="Not now"
      onSecondary={handleDismiss}
    />
  );
}
