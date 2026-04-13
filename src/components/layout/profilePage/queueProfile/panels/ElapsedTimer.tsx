"use client";

import { useState, useEffect } from "react";

export function formatElapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0м 0с";
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor((total / 60) % 60);
  const h = Math.floor(total / 3600);

  if (h > 0) {
    return `${h}ч ${m}м ${s}с`;
  }
  return `${m}м ${s}с`;
}

/** Секунды с момента ISO-времени (для таймера обслуживания по servingAt с сервера). */
export function elapsedSecondsSinceIso(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

export default function ElapsedTimer({
  initialSeconds = 0,
  className = "text-[#000] text-[16px] not-italic font-bold leading-[normal]",
}: {
  initialSeconds?: number;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(initialSeconds);

  useEffect(() => {
    const start = Date.now() - initialSeconds * 1000;
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);

  return <span className={className}>{formatElapsed(elapsed)}</span>;
}
