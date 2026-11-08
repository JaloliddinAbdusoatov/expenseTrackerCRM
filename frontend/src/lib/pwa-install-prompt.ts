/**
 * Chromium exposes install only via beforeinstallprompt; listener must be registered
 * early so we do not miss the event before React mounts.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeDeferredPwaPrompt(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getDeferredPwaPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export async function runDeferredPwaPrompt() {
  const d = deferred;
  if (!d) return { outcome: 'unavailable' as const };
  await d.prompt();
  const { outcome } = await d.userChoice;
  deferred = null;
  notify();
  if (outcome === 'accepted') return { outcome: 'accepted' as const };
  return { outcome: 'dismissed' as const };
}

export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function initPwaInstallListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

initPwaInstallListeners();
