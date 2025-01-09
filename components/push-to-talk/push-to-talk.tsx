'use client';

import { useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePushToTalk } from './use-push-to-talk';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PushToTalkProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob) => Promise<void>;
  position?: 'top-right' | 'middle-right' | 'bottom-right';
  showAudioLevel?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  isFixed?: boolean;
}

const positionClasses = {
  'top-right': 'top-8 right-8',
  'middle-right': 'top-1/2 -translate-y-1/2 right-8',
  'bottom-right': 'bottom-8 right-8'
};

const sizeClasses = {
  small: 'h-10 w-10',
  medium: 'h-12 w-12',
  large: 'h-14 w-14'
};

const sizeIconClasses = {
  small: 'h-4 w-4',
  medium: 'h-5 w-5',
  large: 'h-6 w-6'
};

export function PushToTalk({
  onRecordingStart,
  onRecordingStop,
  position = 'middle-right',
  showAudioLevel = true,
  size = 'medium',
  disabled = false,
  className,
  isFixed = false
}: PushToTalkProps) {
  const { toast } = useToast();
  const {
    isRecording,
    startRecording,
    stopRecording,
    hasPermission,
    audioLevel,
    error
  } = usePushToTalk({
    onRecordingStart,
    onRecordingStop
  });

  // Show error toast if something goes wrong
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: error.message
      });
    }
  }, [error, toast]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle space if not in an input/textarea
      if (e.code === 'Space' && 
          !disabled && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); // Prevent page scroll
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, startRecording, stopRecording, disabled]);

  // Request permission on mount if needed
  useEffect(() => {
    if (!hasPermission && !disabled) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone permission granted');
        })
        .catch((err) => {
          console.error('Microphone permission denied:', err);
          toast({
            variant: 'destructive',
            title: 'Permission Required',
            description: 'Please allow microphone access to use voice messages.'
          });
        });
    }
  }, [hasPermission, disabled, toast]);

  // Handle mobile touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent touch event from triggering mouse events
    if (!disabled) {
      startRecording();
    }
  }, [startRecording, disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'rounded-full transition-all duration-200',
              'flex items-center justify-center relative overflow-hidden',
              'bg-gradient-to-br from-white to-slate-100',
              'hover:from-purple-500 hover:to-purple-600 hover:shadow-[0_0_50px_0px_rgba(168,85,247,0.4)]',
              'group',
              'focus:outline-none focus:ring-4 focus:ring-white/20',
              'shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)]',
              'dark:from-slate-200 dark:to-white dark:hover:from-white dark:hover:to-slate-100',
              isRecording && [
                'from-purple-500 to-purple-600',
                'shadow-[0_0_50px_0px_rgba(168,85,247,0.4)]'
              ],
              disabled && 'opacity-50 cursor-not-allowed',
              isFixed && [
                'fixed z-[100]',
                positionClasses[position]
              ],
              sizeClasses[size],
              className
            )}
            onMouseDown={disabled ? undefined : startRecording}
            onMouseUp={disabled ? undefined : stopRecording}
            onMouseLeave={isRecording ? stopRecording : undefined}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={disabled}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            title="Hold to record (or press space bar)"
          >
            <div className={cn(
              "absolute inset-0 rounded-full transition-opacity duration-200",
              "bg-[conic-gradient(from_0deg,theme(colors.purple.200),theme(colors.purple.500),theme(colors.purple.200))]",
              isRecording ? "opacity-100" : "opacity-0"
            )} />
            <div className={cn(
              "absolute inset-[2px] rounded-full transition-colors duration-200",
              isRecording ? "bg-purple-500" : "bg-white"
            )} />

            {showAudioLevel && isRecording && (
              <div 
                className="absolute inset-[2px] rounded-full bg-white/10 transition-all duration-75 ease-out"
                style={{ 
                  transform: `scale(${1 + audioLevel * 0.15})`,
                  opacity: 0.3 + audioLevel * 0.7
                }}
              />
            )}
            <Mic className={cn(
              'relative z-10 transition-colors duration-200',
              isRecording || 'hover:text-white',
              isRecording ? 'text-white' : 'text-purple-500 dark:text-purple-400',
              sizeIconClasses[size],
              isRecording && 'scale-90 transition-transform duration-200'
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[200px]">
          <p>Hold to record a voice message. Release to send to the current channel.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 