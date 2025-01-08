'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

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

interface LoadingStarsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingStars({ className, size = 'md', text }: LoadingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars, setStars] = useState<OrbitalStar[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Size mappings
  const sizeDimensions = {
    sm: { width: 100, height: 100, starCount: 5 },
    md: { width: 200, height: 200, starCount: 8 },
    lg: { width: 300, height: 300, starCount: 12 }
  };

  const { width, height, starCount } = sizeDimensions[size];

  useEffect(() => {
    // Initialize stars
    const initialStars: OrbitalStar[] = Array.from({ length: starCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * 30,
      orbitSpeed: 0.5 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
      opacity: 0.5 + Math.random() * 0.5,
      twinkleSpeed: 0.02 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      verticalOffset: Math.random() * 10,
      verticalPhase: Math.random() * Math.PI * 2,
      verticalSpeed: 0.02 + Math.random() * 0.02,
      radiusPhase: Math.random() * Math.PI * 2,
      radiusSpeed: 0.01 + Math.random() * 0.01,
      individualSpeed: 0.5 + Math.random() * 0.5,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
      x: 0,
      y: 0,
      wanderPhase: Math.random() * Math.PI * 2,
      wanderSpeed: 0.01 + Math.random() * 0.01,
    }));
    setStars(initialStars);
  }, [starCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Style overrides for canvas element
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw each star
      const updatedStars = stars.map(star => {
        // Update star position
        const updatedStar = { ...star };
        updatedStar.angle += star.orbitSpeed * 0.02;
        
        // Calculate base position
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Add wobble effect
        const wobble = Math.sin(time * 0.001 * star.wobbleSpeed + star.wobblePhase) * 5;
        const radiusVariation = Math.sin(time * 0.001 * star.radiusSpeed + star.radiusPhase) * 10;
        const currentRadius = star.radius + radiusVariation;
        
        // Calculate position with all effects
        updatedStar.x = centerX + Math.cos(updatedStar.angle) * (currentRadius + wobble);
        updatedStar.y = centerY + Math.sin(updatedStar.angle) * (currentRadius + wobble);
        
        // Add vertical oscillation
        updatedStar.y += Math.sin(time * 0.001 * star.verticalSpeed + star.verticalPhase) * star.verticalOffset;
        
        // Calculate opacity with twinkling effect
        const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed + star.phase);
        const opacity = star.opacity * (0.7 + twinkle * 0.3);

        // Draw star
        ctx.beginPath();
        ctx.fillStyle = `hsla(220, 100%, 90%, ${opacity})`;
        ctx.arc(updatedStar.x, updatedStar.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Optional: Add glow effect
        const gradient = ctx.createRadialGradient(
          updatedStar.x, updatedStar.y, 0,
          updatedStar.x, updatedStar.y, star.size * 2
        );
        gradient.addColorStop(0, `hsla(220, 100%, 90%, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'hsla(220, 100%, 90%, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(updatedStar.x, updatedStar.y, star.size * 2, 0, Math.PI * 2);
        ctx.fill();

        return updatedStar;
      });

      setStars(updatedStars);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stars, width, height]);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      className || ""
    )}>
      <canvas
        ref={canvasRef}
        className="cosmic-canvas"
      />
      {text && (
        <p className="mt-4 text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
} 