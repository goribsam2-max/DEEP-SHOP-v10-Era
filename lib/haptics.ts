// Apple-Grade Taptic & Haptic Engine for iOS, Android, macOS, and Windows

export type HapticPattern = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'toggle' 
  | 'success' 
  | 'warning' 
  | 'error';

// Lazy Web Audio Context for Desktop/iOS Taptic Sound Fallback
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Synthesize a subtle, highly realistic Apple Taptic Engine tactile tick click
const playTapticAudioFeedback = (type: HapticPattern) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;

    // Frequencies and decay calibrated for realistic tactile click feel
    switch (type) {
      case 'toggle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.012);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.012);
        break;

      case 'heavy':
      case 'error':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.025);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
        break;

      case 'medium':
      case 'warning':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.015);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.015);
        break;

      case 'success':
        // Two quick ascending micro ticks
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.015);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.015);
        break;

      case 'selection':
      case 'light':
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.009);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.009);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.009);
        break;
    }
  } catch (e) {
    // Ignore audio context autoplay restriction or errors
  }
};

/**
 * Trigger Apple-like Haptic Feedback
 * Works natively on Android & iOS devices with physical motor via navigator.vibrate,
 * and synthesizes Apple Taptic clicks via Web Audio API on Mac/Windows/Desktops.
 */
export const triggerHaptic = (type: HapticPattern = 'light') => {
  if (typeof window === 'undefined') return;

  // 1. Try Physical Vibration API (Android, Mobile Chrome, Safari PWA if supported)
  if (window.navigator && typeof window.navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'toggle':
          window.navigator.vibrate([6, 12, 6]);
          break;
        case 'selection':
        case 'light':
          window.navigator.vibrate(8);
          break;
        case 'medium':
          window.navigator.vibrate(14);
          break;
        case 'heavy':
          window.navigator.vibrate(22);
          break;
        case 'success':
          window.navigator.vibrate([10, 30, 15]);
          break;
        case 'warning':
          window.navigator.vibrate([15, 40, 15]);
          break;
        case 'error':
          window.navigator.vibrate([20, 50, 20, 50, 25]);
          break;
        default:
          window.navigator.vibrate(8);
          break;
      }
    } catch (e) {
      // Ignore
    }
  }

  // 2. Play Web Audio Taptic click on desktop or as fallback/enhancement
  playTapticAudioFeedback(type);
};

// Shorthand helpers
export const triggerSelectionHaptic = () => triggerHaptic('selection');
export const triggerToggleHaptic = () => triggerHaptic('toggle');
export const triggerSuccessHaptic = () => triggerHaptic('success');
export const triggerWarningHaptic = () => triggerHaptic('warning');
export const triggerErrorHaptic = () => triggerHaptic('error');

/**
 * Initialize Site-Wide Global Haptics Listener.
 * Automatically intercepts clicks on buttons, toggles, switches, tabs, inputs, and links across the whole website!
 */
export const initGlobalHaptics = () => {
  if (typeof window === 'undefined' || (window as any).__globalHapticsInitialized) return;
  (window as any).__globalHapticsInitialized = true;

  const handleGlobalPointer = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if element or any parent asks for no haptics
    const optOutEl = target.closest('[data-no-haptic]');
    if (optOutEl) return;

    // Custom haptic type via attribute e.g. data-haptic="toggle"
    const hapticEl = target.closest('[data-haptic]') as HTMLElement | null;
    if (hapticEl) {
      const type = (hapticEl.getAttribute('data-haptic') as HapticPattern) || 'light';
      triggerHaptic(type);
      return;
    }

    // Toggle / Switch / Checkbox / Radio
    const toggleEl = target.closest('button[role="switch"], [data-state], input[type="checkbox"], input[type="radio"], .switch');
    if (toggleEl) {
      triggerHaptic('toggle');
      return;
    }

    // Buttons, Tabs, Links, Menu Items, Dropdown Triggers
    const buttonEl = target.closest('button, a, [role="button"], [role="tab"], [role="menuitem"], .btn, input[type="submit"], input[type="button"]');
    if (buttonEl) {
      triggerHaptic('light');
      return;
    }
  };

  // Attach pointerdown or click event listener
  window.addEventListener('click', handleGlobalPointer, { capture: true, passive: true });
};
