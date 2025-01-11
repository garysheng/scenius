import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Pause } from 'lucide-react';
import { useMessagePlayback } from '@/lib/hooks/use-message-playback';
import { VoicePlaybackMessage } from '@/lib/types/voice-playback';
import { cn } from '@/lib/utils';

interface MessagePlaybackControlsProps {
  messages: VoicePlaybackMessage[];
  spaceId: string;
  className?: string;
}

export function MessagePlaybackControls({
  messages,
  spaceId,
  className
}: MessagePlaybackControlsProps) {
  const {
    isPlaying,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    currentMessageId
  } = useMessagePlayback(spaceId);

  const handlePlayPause = useCallback(async () => {
    if (!isPlaying) {
      if (currentMessageId) {
        await resumePlayback();
      } else {
        await startPlayback(messages);
      }
    } else {
      await pausePlayback();
    }
  }, [isPlaying, currentMessageId, messages, startPlayback, pausePlayback, resumePlayback]);

  return (
    <div className={cn('fixed top-4 right-4 flex gap-2', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handlePlayPause}
        className="h-8 w-8"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      {isPlaying && (
        <Button
          variant="outline"
          size="icon"
          onClick={stopPlayback}
          className="h-8 w-8"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 