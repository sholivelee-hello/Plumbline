"use client";

import { useEffect, useState } from "react";

const PIECES = 18;
const COLORS = ["#F59E0B", "#F43F5E", "#6366F1", "#A855F7", "#10B981", "#7575D8"];

interface CelebrateOverlayProps {
  trigger: number; // increment to replay
}

export function CelebrateOverlay({ trigger }: CelebrateOverlayProps) {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;
    setKey((k) => k + 1);
    setPlaying(true);
    const timer = setTimeout(() => setPlaying(false), 1400);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!playing) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-hidden">
      <div key={key} className="relative w-0 h-0">
        {Array.from({ length: PIECES }).map((_, i) => {
          const angle = (i / PIECES) * Math.PI * 2;
          const dist = 120 + Math.random() * 80;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist;
          const color = COLORS[i % COLORS.length];
          const delay = Math.random() * 0.15;
          return (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-sm animate-confetti-pop"
              style={{
                backgroundColor: color,
                top: 0,
                left: 0,
                transform: `translate(${dx}px, ${dy}px)`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
