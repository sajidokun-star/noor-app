/**
 * PWA helpers: service-worker registration, reliable notifications and iOS install detection.
 *
 * Why notifications go through the service worker: Android Chrome throws on
 * `new Notification()`, and iOS only supports notifications from an installed
 * (Add to Home Screen) web app via `ServiceWorkerRegistration.showNotification`.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export interface AppNotificationOptions {
  title: string;
  body: string;
  /** Same tag replaces an existing notification instead of stacking duplicates. */
  tag?: string;
  /** Hash route to open on tap, e.g. "#/prayer". */
  hash?: string;
}

/**
 * Shows a system notification. Always `silent` so the OS never adds its own sound on top
 * of the Azan audio (this prevented the "double sound" effect).
 * Returns true if a notification was handed to the OS.
 */
export async function showAppNotification(opts: AppNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body: opts.body,
    tag: opts.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    silent: true,
    data: { url: `/${opts.hash ?? ''}` },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(opts.title, options);
        return true;
      }
    }
  } catch {
    // fall through to the constructor
  }

  try {
    const n = new Notification(opts.title, options);
    n.onclick = () => {
      window.focus();
      if (opts.hash) window.location.hash = opts.hash;
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** True on iPhone/iPad (including iPadOS reporting as Mac). */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

/** True when launched from the Home Screen (standalone display mode). */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** iOS only delivers web notifications to installed web apps. */
export function needsIOSInstallForNotifications(): boolean {
  return isIOSDevice() && !isStandalonePWA();
}
