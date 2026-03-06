"use client";

import { useState, useEffect } from "react";

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (seconds < 3600) return `${m}м ${s}с`;
  const h = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  return `${h}ч ${mm}м ${ss}с`;
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
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);

  return <span className={className}>{formatElapsed(elapsed)}</span>;
}
