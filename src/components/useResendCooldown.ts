"use client";
import { useEffect, useState } from "react";

export function useResendCooldown(seconds = 60) {
  const [resendAt, setResendAt] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setResendIn(remaining);
      if (!remaining) setResendAt(0);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  return {
    resendIn,
    start: () => setResendAt(Date.now() + seconds * 1000)
  };
}
