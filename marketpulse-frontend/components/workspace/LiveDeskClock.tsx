"use client";

import { useEffect, useEffectEvent, useState } from "react";

function formatClock(now: Date) {
  const stamp = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(now);

  return `${stamp} CT`;
}

export default function LiveDeskClock() {
  const [now, setNow] = useState(() => new Date());
  const syncClock = useEffectEvent(() => {
    setNow(new Date());
  });

  useEffect(() => {
    syncClock();

    const interval = window.setInterval(() => {
      syncClock();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return <span>{formatClock(now)}</span>;
}
