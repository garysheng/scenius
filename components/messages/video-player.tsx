'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export function VideoPlayer({ src, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Reset video when src changes
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
} 