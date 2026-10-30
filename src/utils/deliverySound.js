/**
 * Sound & Notification Utility for Delivery Partners
 * Uses Web Audio API for 100% offline-ready synthesized ringtone alerts,
 * Web Notifications API for desktop/mobile notifications,
 * and Vibration API for haptic alert.
 */

class DeliverySoundManager {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.ringInterval = null;
    this.stopTimeout = null;
    this.activeOscillators = [];
    
    // Read persisted sound preference (default: enabled)
    try {
      const stored = localStorage.getItem('kirsab_delivery_sound_enabled');
      this.soundEnabled = stored !== null ? stored === 'true' : true;
    } catch {
      this.soundEnabled = true;
    }
  }

  /**
   * Lazily get or resume AudioContext (browser audio policy requires gesture)
   */
  getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    try {
      localStorage.setItem('kirsab_delivery_sound_enabled', String(this.soundEnabled));
    } catch {}
    if (!this.soundEnabled) {
      this.stop();
    }
    return this.soundEnabled;
  }

  toggleSound() {
    return this.setSoundEnabled(!this.soundEnabled);
  }

  /**
   * Synthesize a single clear harmonic bell chime note
   */
  playChimeNote(freq, startTime, duration = 0.22, volume = 0.4) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Triangle wave provides rich, melodic harmonics like a delivery bell
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Attack: gentle rise to avoid clicks
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
      // Decay: exponential fade
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);

      this.activeOscillators.push(osc);
    } catch (err) {
      console.warn('Audio tone synthesis error:', err);
    }
  }

  /**
   * Play a single 3-note melodic chime cycle (Ding-Dong-Ding)
   * Notes: G5 (784Hz) -> B5 (988Hz) -> E6 (1318Hz)
   */
  playSingleCycle(startDelay = 0.05) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime + startDelay;
    this.playChimeNote(784, baseTime, 0.25, 0.45);
    this.playChimeNote(988, baseTime + 0.22, 0.25, 0.45);
    this.playChimeNote(1318, baseTime + 0.44, 0.48, 0.55);
  }

  /**
   * Play a full attention-grabbing order ring (rings for ~7 seconds or until dismissed)
   */
  playOrderRing(durationMs = 7000) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stop(); // Stop any existing ringing
    this.isPlaying = true;

    // Play initial cycle immediately
    this.playSingleCycle(0.05);
    this.playSingleCycle(0.95);

    // Repeat every 1.8 seconds until duration expires
    let cycleCount = 0;
    const maxCycles = Math.ceil(durationMs / 1800);

    this.ringInterval = setInterval(() => {
      cycleCount++;
      if (cycleCount >= maxCycles) {
        this.stop();
        return;
      }
      this.playSingleCycle(0.05);
      this.playSingleCycle(0.95);
    }, 1800);

    // Auto-stop safety timeout
    this.stopTimeout = setTimeout(() => {
      this.stop();
    }, durationMs);
  }

  /**
   * Short 1-second chime test for verifying audio output
   */
  testSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.stop();
    this.playSingleCycle(0.05);
    this.playSingleCycle(0.65);
  }

  /**
   * Immediately stop any ringing
   */
  stop() {
    this.isPlaying = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {}
    });
    this.activeOscillators = [];
  }
}

export const deliverySound = new DeliverySoundManager();

/**
 * Ask browser for permission to show OS/desktop notifications
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const status = await Notification.requestPermission();
    return status;
  } catch {
    return 'denied';
  }
}

/**
 * Display a native browser notification (even if browser tab is in background)
 */
export function showBrowserNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'kirsab-delivery-order',
      renotify: true,
      requireInteraction: true,
      ...options,
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      notif.close();
      if (typeof options.onClick === 'function') {
        options.onClick();
      }
    };

    return notif;
  } catch (err) {
    console.warn('Could not display notification:', err);
    return null;
  }
}

/**
 * Trigger physical phone vibration pattern (if mobile browser supports it)
 */
export function triggerVibration(pattern = [300, 150, 300, 150, 600]) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
