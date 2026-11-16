import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

type UpdateStateSnapshot = {
  needRefresh: boolean;
  isUpdating: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
};

let snapshot: UpdateStateSnapshot = {
  needRefresh: false,
  isUpdating: false,
  isChecking: false,
  lastCheckedAt: null,
};

let swRegistration: ServiceWorkerRegistration | null = null;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;
let lastAutoCheckMs = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function setSnapshot(partial: Partial<UpdateStateSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  notifyListeners();
}

function initPwaRegistration() {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  initialized = true;

  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        setSnapshot({ needRefresh: true, isChecking: false });
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          swRegistration = registration;
          // Check immediately once in case a waiting SW already exists
          if (registration.waiting) {
            setSnapshot({ needRefresh: true });
          }
        }
      },
      onRegisterError(err) {
        console.warn('Service Worker kaydı sırasında hata:', err);
      },
    });
  } catch (err) {
    console.warn('PWA registerSW başlatılamadı:', err);
  }
}

export async function triggerSwUpdateCheck(force = false): Promise<'update-available' | 'up-to-date' | 'unavailable'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unavailable';
  }
  if (!navigator.onLine) {
    return 'unavailable';
  }

  const now = Date.now();
  if (!force && now - lastAutoCheckMs < 25_000) {
    return snapshot.needRefresh ? 'update-available' : 'up-to-date';
  }
  lastAutoCheckMs = now;

  initPwaRegistration();
  setSnapshot({ isChecking: true });

  try {
    const reg =
      swRegistration ||
      (await navigator.serviceWorker.getRegistration()) ||
      null;

    if (!reg) {
      setSnapshot({ isChecking: false, lastCheckedAt: Date.now() });
      return 'unavailable';
    }

    swRegistration = reg;
    await reg.update();

    if (reg.waiting || snapshot.needRefresh) {
      setSnapshot({ needRefresh: true, isChecking: false, lastCheckedAt: Date.now() });
      return 'update-available';
    }

    // Watch a freshly installing worker in case update() just triggered download
    if (reg.installing) {
      const installing = reg.installing;
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 4000);
        const onState = () => {
          if (installing.state === 'installed' || installing.state === 'redundant') {
            window.clearTimeout(timer);
            installing.removeEventListener('statechange', onState);
            resolve();
          }
        };
        installing.addEventListener('statechange', onState);
      });
    }

    const foundUpdate = Boolean(reg.waiting || snapshot.needRefresh);
    setSnapshot({
      needRefresh: foundUpdate,
      isChecking: false,
      lastCheckedAt: Date.now(),
    });
    return foundUpdate ? 'update-available' : 'up-to-date';
  } catch {
    setSnapshot({ isChecking: false, lastCheckedAt: Date.now() });
    return 'unavailable';
  }
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateStateSnapshot>(snapshot);
  const [dismissedForUpdate, setDismissedForUpdate] = useState(false);

  useEffect(() => {
    initPwaRegistration();

    const listener = () => setState({ ...snapshot });
    listeners.add(listener);
    listener();

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void triggerSwUpdateCheck(false);
      }
    };
    const handleFocus = () => {
      void triggerSwUpdateCheck(false);
    };
    const handleOnline = () => {
      void triggerSwUpdateCheck(true);
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void triggerSwUpdateCheck(false);
      }
    }, 15 * 60 * 1000);

    return () => {
      listeners.delete(listener);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(intervalId);
    };
  }, []);

  // Re-open banner if a brand-new waiting state turns true after previously being false
  useEffect(() => {
    if (!state.needRefresh) {
      setDismissedForUpdate(false);
    }
  }, [state.needRefresh]);

  const applyUpdate = useCallback(async () => {
    setSnapshot({ isUpdating: true });
    try {
      if (updateSWFn) {
        await updateSWFn(true);
      } else if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      // Fallback reload below handles edge cases
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 1800);
  }, []);

  const dismissUpdate = useCallback(() => {
    setDismissedForUpdate(true);
  }, []);

  const checkNow = useCallback(async () => {
    setDismissedForUpdate(false);
    return triggerSwUpdateCheck(true);
  }, []);

  return {
    needRefresh: state.needRefresh && !dismissedForUpdate,
    hasPendingUpdate: state.needRefresh,
    isUpdating: state.isUpdating,
    isChecking: state.isChecking,
    lastCheckedAt: state.lastCheckedAt,
    applyUpdate,
    dismissUpdate,
    checkNow,
  };
}
