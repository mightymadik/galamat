"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ZoomImageProps = {
  src: string;
  width: number;
  height: number;
  zoom?: number;
  radius?: number;
};

export function ZoomImage({
  src,
  width,
  height,
  zoom = 2.2,
  radius = 32,
}: ZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-white overflow-hidden"
      style={{
        borderRadius: radius,
        aspectRatio: `${width} / ${height}`,
      }}
      onMouseEnter={() => isDesktop && setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPos({ x: 50, y: 50 });
      }}
      onMouseMove={isDesktop ? handleMouseMove : undefined}
    >
      <Image
        src={src}
        alt="plan"
        fill
        draggable={false}
        sizes="(max-width: 768px) 100vw, 454px"
        className="object-contain transition-transform duration-200 ease-out"
        style={{
          transform: hovered ? `scale(${zoom})` : "scale(1)",
          transformOrigin: `${pos.x}% ${pos.y}%`,
        }}
      />
    </div>
  );
}