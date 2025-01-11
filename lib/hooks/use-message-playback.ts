import { useCallback, useEffect, useState } from 'react';
import { playbackManager } from '@/lib/services/client/playback-manager';
import { VoicePlaybackMessage } from '@/lib/types/voice-playback';

export function useMessagePlayback(spaceId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  useEffect(() => {
    const state = playbackManager.getPlaybackState();
    setIsPlaying(state.isPlaying);
    setCurrentMessageId(state.currentMessageId);

    const listener = (message: VoicePlaybackMessage) => {
      if (message.status === 'playing') {
        setCurrentMessageId(message.id);
        setIsPlaying(true);
      } else if (message.status === 'completed' || message.status === 'failed') {
        setCurrentMessageId(null);
      }
    };

    const unsubscribe = playbackManager.addMessageStatusListener(listener);
    return () => {
      unsubscribe();
    };
  }, []);

  const startPlayback = useCallback(async (messages: VoicePlaybackMessage[], startFromMessageId?: string) => {
    await playbackManager.startPlayback(messages, spaceId, startFromMessageId);
    setIsPlaying(true);
  }, [spaceId]);

  const stopPlayback = useCallback(async () => {
    await playbackManager.stopPlayback();
    setIsPlaying(false);
    setCurrentMessageId(null);
  }, []);

  const pausePlayback = useCallback(async () => {
    await playbackManager.pausePlayback();
    setIsPlaying(false);
  }, []);

  const resumePlayback = useCallback(async () => {
    await playbackManager.resumePlayback();
    setIsPlaying(true);
  }, []);

  const skipToMessage = useCallback(async (messageId: string) => {
    await playbackManager.skipToMessage(messageId);
  }, []);

  return {
    isPlaying,
    currentMessageId,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    skipToMessage
  };
} 