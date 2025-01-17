import { cn } from '@/lib/utils';

interface MessagePlaybackHighlightProps {
  isPlaying: boolean;
  children: React.ReactNode;
  className?: string;
}

export function MessagePlaybackHighlight({
  isPlaying,
  children,
  className
}: MessagePlaybackHighlightProps) {
  return (
    <div
      className={cn(
        'relative transition-all duration-300',
        isPlaying && 'bg-primary/5',
        className
      )}
    >
      {isPlaying && (
        <div className="absolute inset-0 rounded-lg bg-primary/5" />
      )}
      {children}
    </div>
  );
}

// Add this to your globals.css
/*
@keyframes glow {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--primary) / 0.3);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(var(--primary) / 0.1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--primary) / 0.3);
  }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}
*/ 