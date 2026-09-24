"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface GradientLoaderProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

export const GradientLoader = ({
  className,
  size,
  glow = true,
  ...props
}: GradientLoaderProps) => {
  const rawId = useId();
  // Safe unique ID for SVG linearGradient
  const gradientId = `purple-baby-pink-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "animate-spin",
        glow && "drop-shadow-[0_0_8px_rgba(244,114,182,0.45)]",
        className
      )}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {/* Vibrant Purple */}
          <stop offset="0%" stopColor="#9333ea" />
          {/* Orchid / Soft Violet */}
          <stop offset="45%" stopColor="#c084fc" />
          {/* Rose Pink */}
          <stop offset="75%" stopColor="#f472b6" />
          {/* Baby Pink */}
          <stop offset="100%" stopColor="#fbcfe8" />
        </linearGradient>
      </defs>
      {/* Background track circle with subtle baby-pink / purple tint */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="#f472b6"
        strokeWidth="2.5"
        className="opacity-20"
      />
      {/* Spinning arc with purple to baby pink gradient */}
      <path
        d="M21 12a9 9 0 1 1-6.219-8.56"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default GradientLoader;
