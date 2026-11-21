import { useEffect, useRef } from 'react';

export const useLiveSync = (onUpdate, fallbackIntervalMs = 8000) => {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const eventsUrl =
      window.location.port === '5173'
        ? 'http://localhost:5000/api/events'
        : '/api/events';

    let es = null;
    let debounceTimer = null;

    const triggerDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!document.hidden) {
          callbackRef.current?.(true);
        }
      }, 150);
    };

    try {
      es = new EventSource(eventsUrl);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && data.type !== 'CONNECTED') {
            triggerDebounced();
          }
        } catch (_) {}
      };
    } catch (_) {}

    // Fallback polling ONLY runs if EventSource is disconnected (readyState !== 1)
    const timer = setInterval(() => {
      const sseConnected = es && es.readyState === 1;
      if (!sseConnected && !document.hidden) {
        callbackRef.current?.(true);
      }
    }, fallbackIntervalMs);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (es) es.close();
      clearInterval(timer);
    };
  }, [fallbackIntervalMs]);
};
