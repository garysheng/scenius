'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  phase: number;
  baseOpacity: number;
}

export const TwinklingStars = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const generateStars = () => {
      const stars: Star[] = [];
      const numStars = Math.floor((window.innerWidth * window.innerHeight) / 15000);

      for (let i = 0; i < numStars; i++) {
        const baseOpacity = 0.3 + Math.random() * 0.4;
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3,
          twinkleSpeed: 0.0001 + Math.random() * 0.0003,
          phase: Math.random() * Math.PI * 2,
          baseOpacity
        });
      }

      starsRef.current = stars;
    };

    const animate: FrameRequestCallback = (timestamp) => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        const twinkleAmount = Math.sin(timestamp * star.twinkleSpeed + star.phase) * 0.3 + 0.7;
        const finalOpacity = star.baseOpacity * twinkleAmount;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${finalOpacity})`;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resizeCanvas();
      generateStars();
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    animate(performance.now());

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}; 