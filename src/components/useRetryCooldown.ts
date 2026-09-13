"use client";
import { useEffect, useState } from "react";

export function useRetryCooldown() {
  const [retryAt, setRetryAt] = useState(0);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setRetryAfter(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function handleRateLimit(response: Response) {
    if (response.status !== 429) return;
    const seconds = Number(response.headers.get("Retry-After"));
    const delay = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
    setRetryAfter(delay);
    setRetryAt(Date.now() + delay * 1000);
  }

  return { retryAfter, handleRateLimit };
}
