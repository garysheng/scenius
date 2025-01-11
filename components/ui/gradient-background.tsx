'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
  className?: string;
}

export function GradientBackground({ className }: GradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = container.getBoundingClientRect();
      
      // Calculate relative position (0 to 1)
      const x = (clientX - left) / width;
      const y = (clientY - top) / height;
      
      // Update the gradient position
      container.style.setProperty('--x', `${x * 100}%`);
      container.style.setProperty('--y', `${y * 100}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'fixed inset-0 pointer-events-none transition-opacity duration-300',
        'bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(120,119,198,0.1)_0%,rgba(120,119,198,0.05)_25%,transparent_50%)]',
        'before:absolute before:inset-0',
        'before:bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(167,139,250,0.1)_0%,rgba(167,139,250,0.05)_25%,transparent_50%)]',
        'before:animate-pulse',
        'after:absolute after:inset-0',
        'after:bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(139,92,246,0.1)_0%,rgba(139,92,246,0.05)_25%,transparent_50%)]',
        'after:animate-pulse after:animation-delay-1000',
        className
      )}
      style={{ 
        '--x': '50%', 
        '--y': '50%'
      } as React.CSSProperties}
    />
  );
} 