import { useCallback, useEffect, useRef, useState } from 'react';

export function useVersionCheck({
  getRemoteVersion,
  pollMs = 5 * 60 * 1000, // 5 minutos
  localVersion = process.env.NEXT_PUBLIC_APP_VERSION || ''
}) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const timerRef = useRef(null);

  const check = useCallback(async () => {
    try {
      const remote = await getRemoteVersion();
      if (remote && localVersion && remote !== localVersion) {
        setUpdateAvailable(true);
      }
    } catch {/* opcional: log */}
  }, [getRemoteVersion, localVersion]);

  useEffect(() => {
    check(); // primer chequeo
    timerRef.current = window.setInterval(check, pollMs);

    const onFocus = () => check();
    const onVisible = () => document.visibilityState === 'visible' && check();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check, pollMs]);

  const triggerReload = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
    } catch {}
    window.location.reload();
  }, []);

  return { updateAvailable, triggerReload };
}
