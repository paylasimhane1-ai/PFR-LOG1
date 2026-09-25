import { PushNotificationSettings } from '../types';
import { playChime } from './audio';

export const DEFAULT_PUSH_SETTINGS: PushNotificationSettings = {
  enabled: true,
  notifyOnRampAssign: true,
  notifyOnAdminCall: true,
  notifyOnVehicleEntry: true,
  notifyOnMention: true,
};

const STORAGE_KEY = 'yms_push_settings';

export function loadPushSettings(): PushNotificationSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PUSH_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PUSH_SETTINGS;
}

export function savePushSettings(settings: PushNotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth <= 768);
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
}

export async function checkPushNotificationReadiness() {
  const supported = isNotificationSupported();
  const permission = getNotificationPermission();
  const isMobile = isMobileDevice();
  const isIOS = isIOSDevice();
  const isPWA = isStandalonePWA();

  let serviceWorkerReady = false;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      serviceWorkerReady = !!reg;
    } catch {
      serviceWorkerReady = false;
    }
  }

  return {
    supported,
    permission,
    isMobile,
    isIOS,
    isPWA,
    serviceWorkerReady,
    canShowPush: supported && permission === 'granted'
  };
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Ses bağlamını aç ve titreşimi test et
      try {
        playChime('success');
      } catch {
        // ignore
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // ignore
        }
      }
    }
    return permission;
  } catch (err) {
    console.warn('Bildirim izni istenirken hata:', err);
    return Notification.permission;
  }
}

export interface SendNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  soundType?: 'call' | 'alert' | 'message' | 'success';
  onClickUrl?: string;
}

/**
 * Mobil (Android / iOS PWA) ve Masaüstü tarayıcılarda bildirim gönderir.
 * Android'de ServiceWorker registration.showNotification zorunludur.
 */
export async function sendNativeNotification(options: SendNotificationOptions): Promise<boolean> {
  // 1. Ses ve Titreşim (Kullanıcı cihazında anında geri bildirim)
  try {
    if (options.soundType) {
      playChime(options.soundType);
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([250, 100, 250, 100, 400]);
    }
  } catch (audioErr) {
    console.warn('Ses veya titreşim çalınamadı:', audioErr);
  }

  const settings = loadPushSettings();
  if (!settings.enabled) return false;

  if (!isNotificationSupported()) {
    console.warn('Tarayıcı bildirimleri desteklemiyor.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Bildirim izni henüz verilmemiş:', Notification.permission);
    return false;
  }

  const tagId = options.tag || 'yms-notification-' + Date.now();
  const notifOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: options.body,
    icon: options.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: tagId,
    renotify: true,
    vibrate: [250, 100, 250, 100, 400],
    data: {
      url: options.onClickUrl || '/'
    }
  };

  // 2. Mobil Cihazlar İçin Service Worker (Android Chrome'da new Notification() TypeError fırlatır)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(options.title, notifOptions as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service Worker bildirim gösterimi başarısız oldu, masaüstü fallback deneniyor:', swErr);
    }
  }

  // 3. Masaüstü Fallback (Standart Notification constructor)
  try {
    const notification = new Notification(options.title, notifOptions as NotificationOptions);

    notification.onclick = () => {
      try {
        window.focus();
        notification.close();
      } catch {
        // ignore
      }
    };

    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // ignore
      }
    }, 8000);

    return true;
  } catch (err) {
    console.warn('Native notification constructor başarısız:', err);
    return false;
  }
}
