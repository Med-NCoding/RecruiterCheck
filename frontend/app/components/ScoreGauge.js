"use client";

import { useEffect, useState } from "react";

export default function ScoreGauge({ score, isScam }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const target = Math.round(score * 100);
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setAnimatedScore(current);
    }, 18);
    return () => clearInterval(timer);
  }, [score]);

  const strokeColor = isScam
    ? animatedScore > 75
      ? "stroke-danger"
      : "stroke-warning"
    : "stroke-success";

  const textColor = isScam
    ? animatedScore > 75
      ? "text-danger"
      : "text-warning"
    : "text-success";

  return (
    <div className="w-[76px] h-[76px] flex-shrink-0 relative">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {/* Track */}
        <path
          className="fill-none stroke-border"
          strokeWidth="2.6"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        {/* Progress arc */}
        <path
          className={`score-circle fill-none ${strokeColor}`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray={`${animatedScore}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      {/* Centered label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[15px] font-bold tracking-tight ${textColor}`}>
          {animatedScore}%
        </span>
      </div>
    </div>
  );
}
