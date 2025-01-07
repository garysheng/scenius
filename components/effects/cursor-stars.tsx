'use client';

import { useEffect, useRef } from 'react';

interface OrbitalStar {
  angle: number;
  radius: number;
  orbitSpeed: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  phase: number;
  verticalOffset: number;
  verticalPhase: number;
  verticalSpeed: number;
  radiusPhase: number;
  radiusSpeed: number;
  individualSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  x: number;
  y: number;
  wanderPhase: number;
  wanderSpeed: number;
}

export const CursorStars = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const lastMoveRef = useRef(Date.now());
  const starsRef = useRef<OrbitalStar[]>([]);
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
      const stars: OrbitalStar[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        const radius = 150 + Math.random() * 75;
        const x = cursorRef.current.x + Math.cos(angle) * radius;
        const y = cursorRef.current.y + Math.sin(angle) * radius;

        stars.push({
          angle,
          radius,
          orbitSpeed: 0.0002 + Math.random() * 0.0004,
          size: 2 + Math.random(),
          opacity: 0.5 + Math.random() * 0.3,
          twinkleSpeed: 0.00005 + Math.random() * 0.0001,
          phase: Math.random() * Math.PI * 2,
          verticalOffset: 0,
          verticalPhase: Math.random() * Math.PI * 2,
          verticalSpeed: 0.0003 + Math.random() * 0.0004,
          radiusPhase: Math.random() * Math.PI * 2,
          radiusSpeed: 0.0002 + Math.random() * 0.0003,
          individualSpeed: 0.3 + Math.random() * 0.4,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.0001 + Math.random() * 0.0002,
          x,
          y,
          wanderPhase: Math.random() * Math.PI * 2,
          wanderSpeed: 0.0001 + Math.random() * 0.0002
        });
      }
      starsRef.current = stars;
    };

    const animate: FrameRequestCallback = (timestamp) => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const timeSinceMove = Date.now() - lastMoveRef.current;
      const isStationary = timeSinceMove > 100;

      starsRef.current.forEach((star, index) => {
        star.verticalPhase += star.verticalSpeed * star.individualSpeed;
        star.radiusPhase += star.radiusSpeed * star.individualSpeed;
        star.wobblePhase += star.wobbleSpeed;
        star.wanderPhase += star.wanderSpeed;
        
        const verticalOffset = Math.sin(star.verticalPhase) * 50;
        const wobble = Math.sin(star.wobblePhase) * Math.cos(star.wobblePhase * 0.7) * 20;

        if (!isStationary) {
          const timeScale = timestamp * 0.0002;
          const speedVariation = Math.sin(timeScale + index) * 0.1;
          star.angle += (star.orbitSpeed + speedVariation) * star.individualSpeed;

          const dynamicRadius = star.radius + Math.sin(star.radiusPhase) * 40;
          const baseX = Math.cos(star.angle) * dynamicRadius;
          const baseY = Math.sin(star.angle) * dynamicRadius;
          
          star.x = cursorRef.current.x + baseX + wobble * Math.sin(star.angle);
          star.y = cursorRef.current.y + baseY + verticalOffset + wobble * Math.cos(star.angle);
        } else {
          const wanderX = Math.cos(star.wanderPhase) * 2;
          const wanderY = Math.sin(star.wanderPhase * 1.3) * 2;
          
          const drift = Math.sin(timestamp * 0.0001 + index) * 1.5;
          
          star.x += wanderX + drift;
          star.y += wanderY - drift * 0.5;

          const padding = 100;
          if (star.x < -padding) star.x = canvas.width + padding;
          if (star.x > canvas.width + padding) star.x = -padding;
          if (star.y < -padding) star.y = canvas.height + padding;
          if (star.y > canvas.height + padding) star.y = -padding;
        }

        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        const twinkleAmount = Math.sin(timestamp * star.twinkleSpeed + star.phase) * 0.2 + 0.8;
        gradient.addColorStop(0, `hsla(0, 0%, 100%, ${star.opacity * twinkleAmount})`);
        gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
      lastMoveRef.current = Date.now();
    };

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    handleResize();
    generateStars();
    animate(performance.now());

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: 'transparent' }}
    />
  );
}; 