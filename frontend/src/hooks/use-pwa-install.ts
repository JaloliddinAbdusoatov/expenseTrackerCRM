import { useCallback, useEffect, useSyncExternalStore, useState } from 'react';
import {
  getDeferredPwaPrompt,
  runDeferredPwaPrompt,
  subscribeDeferredPwaPrompt,
} from '@/lib/pwa-install-prompt';

export { isIosBrowser } from '@/lib/pwa-install-prompt';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function usePwaInstall() {
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay);

  const hasDeferredPrompt = useSyncExternalStore(
    subscribeDeferredPwaPrompt,
    () => getDeferredPwaPrompt() !== null,
    () => false,
  );

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
  }, []);

  const canUseNativePrompt = hasDeferredPrompt && !isStandalone;

  const triggerInstall = useCallback(() => runDeferredPwaPrompt(), []);

  return {
    canUseNativePrompt,
    isStandalone,
    triggerInstall,
  };
}
