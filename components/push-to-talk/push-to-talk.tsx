'use client';

import { useEffect, useCallback } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePushToTalk } from './use-push-to-talk';
import { useToast } from '@/hooks/use-toast';

interface PushToTalkProps {
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob) => Promise<void>;
  position?: 'top-right' | 'middle-right' | 'bottom-right';
  showAudioLevel?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'middle-right': 'top-1/2 -translate-y-1/2 right-4',
  'bottom-right': 'bottom-4 right-4'
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
  className
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

  if (!hasPermission && !disabled) {
    return null; // Don't show button until permission is granted
  }

  return (
    <button
      className={cn(
        'fixed z-50 rounded-full shadow-lg transition-all duration-200',
        'bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2',
        'focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        isRecording && 'animate-pulse bg-destructive hover:bg-destructive/90',
        disabled && 'opacity-50 cursor-not-allowed',
        positionClasses[position],
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
      <Mic className={cn('text-white', sizeIconClasses[size])} />
      {showAudioLevel && isRecording && (
        <div 
          className="absolute inset-0 rounded-full bg-white/20 transition-transform duration-75"
          style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
        />
      )}
    </button>
  );
} 