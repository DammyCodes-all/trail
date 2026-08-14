'use client';
import { ArrowRight } from 'lucide-react';

type FlowButtonProps = {
  text?: string;
  variant?: 'light' | 'dark';
};

export function FlowButton({
  text = 'Modern Button',
  variant = 'light',
}: FlowButtonProps) {
  const dark = variant === 'dark';
  return (
    <button
      className={`group relative flex cursor-pointer items-center gap-1 overflow-hidden rounded-xl border-[1.5px] px-8 py-3 text-sm font-semibold transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:rounded-md hover:border-transparent active:scale-[0.95] ${
        dark
          ? 'border-white/25'
          : 'border-[#333333]/40'
      }`}
    >
      {/* Left arrow (arr-2) */}
      <ArrowRight
        className={`absolute left-[-25%] z-[9] h-4 w-4 fill-none transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 ${
          dark
            ? 'stroke-[#f2f4f6] group-hover:stroke-[#08090a]'
            : 'stroke-[#111111] group-hover:stroke-white'
        }`}
      />

      {/* Text */}
      <span className={`relative z-[1] -translate-x-3 transition-transform duration-[800ms] ease-out group-hover:translate-x-3 ${
          dark
            ? 'text-[#f2f4f6] group-hover:text-[#08090a]'
            : 'text-[#111111] group-hover:text-white'
        }`}>
        {text}
      </span>

      {/* Circle */}
      <span
        className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:left-1/2 group-hover:top-1/2 group-hover:h-[220px] group-hover:w-[220px] group-hover:-translate-x-1/2 group-hover:-translate-y-1/2 group-hover:opacity-100 ${
          dark ? 'bg-[#ff6a00]' : 'bg-[#111111]'
        }`}
      />

      {/* Right arrow (arr-1) */}
      <ArrowRight
        className={`absolute right-4 z-[9] h-4 w-4 fill-none transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:right-[-25%] ${
          dark
            ? 'stroke-[#f2f4f6] group-hover:stroke-[#08090a]'
            : 'stroke-[#111111] group-hover:stroke-white'
        }`}
      />
    </button>
  );
}