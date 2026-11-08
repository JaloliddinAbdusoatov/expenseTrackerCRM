import { cn } from '@/lib/utils';
import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLogo(props: React.SVGProps<SVGSVGElement>) {
  const isMobile = useIsMobile();
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke={isMobile ? "url(#logoGradient)" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', props.className)}
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(244, 70%, 60%)" />
          <stop offset="50%" stopColor="hsl(188, 83%, 71%)" />
          <stop offset="100%" stopColor="hsl(280, 65%, 60%)" />
        </linearGradient>
      </defs>
      <path d="M7 10a2 2 0 0 0-2-2H3" />
      <path d="M14 20a2 2 0 0 0 2 2h2" />
      <path d="M3 16a2 2 0 0 1 2 2" />
      <path d="M21 12a2 2 0 0 1-2-2" />
      <path d="M17 12a2 2 0 0 0 2-2" />
      <path d="M10 4a2 2 0 0 0-2-2H6" />
      <path d="M21 16a2 2 0 0 0-2 2" />
      <path d="M7 14a2 2 0 0 1 2 2" />
      <path d="M3 12a2 2 0 0 0 2 2" />
      <path d="M10 22a2 2 0 0 0 2-2" />
      <path d="M17 6a2 2 0 0 1 2 2" />
      <path d="M10 8a2 2 0 0 1 2 2" />
      <path d="M3 8a2 2 0 0 1 2-2h1" />
      <path d="M14 4a2 2 0 0 1 2 2" />
    </svg>
  );
}
