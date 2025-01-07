'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  phase: number;
  layer: number;
}

interface StarfieldBackgroundProps {
  hasMessages?: boolean;
}

export const StarfieldBackground = ({ hasMessages = false }: StarfieldBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const scrollOffsetRef = useRef(0);
  const viewHeightRef = useRef(window.innerHeight * (hasMessages ? 2 : 1));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * (hasMessages ? 2 : 1);
      viewHeightRef.current = window.innerHeight * (hasMessages ? 2 : 1);
      canvas.style.height = `${window.innerHeight * (hasMessages ? 2 : 1)}px`;
    };

    const generateStars = () => {
      const stars: Star[] = [];
      const numStars = Math.floor((window.innerWidth * viewHeightRef.current) / 8000);

      for (let i = 0; i < numStars; i++) {
        const layer = Math.floor(Math.random() * 3);
        const baseSize = 0.5 + (layer * 0.3);
        
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * viewHeightRef.current,
          size: baseSize + Math.random() * 0.7,
          opacity: 0.5 + Math.random() * 0.5,
          twinkleSpeed: 0.0001 + Math.random() * 0.0002,
          phase: Math.random() * Math.PI * 2,
          layer
        });
      }

      starsRef.current = stars;
    };

    const animate: FrameRequestCallback = (timestamp) => {
      if (!ctx || !canvas) return;

      const visibleStart = Math.max(0, scrollOffsetRef.current - window.innerHeight);
      const visibleEnd = Math.min(canvas.height, scrollOffsetRef.current + window.innerHeight * 2);

      ctx.clearRect(0, 0, canvas.width, visibleEnd - visibleStart);

      const gradient = ctx.createLinearGradient(0, visibleStart, 0, visibleEnd);
      gradient.addColorStop(0, 'hsl(230, 40%, 4%)');
      gradient.addColorStop(1, 'hsl(230, 40%, 2%)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, visibleStart, canvas.width, visibleEnd - visibleStart);

      starsRef.current.forEach((star) => {
        const baseSpeed = 0.05;
        const parallaxSpeed = baseSpeed + (star.layer * 0.02);
        const yOffset = scrollOffsetRef.current * parallaxSpeed;
        
        let y = star.y - yOffset;
        y = ((y % viewHeightRef.current) + viewHeightRef.current) % viewHeightRef.current;
        
        if (y >= visibleStart && y <= visibleEnd) {
          const twinkleAmount = Math.sin(timestamp * star.twinkleSpeed + star.phase) * 0.3 + 0.7;
          const finalOpacity = star.opacity * twinkleAmount;

          const glowRadius = star.size * (2 + star.layer);
          const gradient = ctx.createRadialGradient(star.x, y, 0, star.x, y, glowRadius);
          const hue = 230 + star.layer * 8;
          gradient.addColorStop(0, `hsla(${hue}, 80%, 90%, ${finalOpacity})`);
          gradient.addColorStop(0.5, `hsla(${hue}, 60%, 80%, ${finalOpacity * 0.3})`);
          gradient.addColorStop(1, 'hsla(230, 40%, 80%, 0)');

          ctx.beginPath();
          ctx.arc(star.x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleScroll = (e: Event) => {
      const container = e.target as HTMLDivElement;
      scrollOffsetRef.current = container.scrollTop;
    };

    const handleResize = () => {
      resizeCanvas();
      generateStars();
    };

    const messageList = canvas.closest('.overflow-auto, .overflow-y-auto');
    if (messageList) {
      messageList.addEventListener('scroll', handleScroll);
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    animate(performance.now());

    return () => {
      messageList?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="absolute inset-0 pointer-events-none" 
      style={{ height: hasMessages ? '200vh' : '100vh' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 w-full pointer-events-none"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}; 