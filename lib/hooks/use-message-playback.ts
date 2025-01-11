import { useState, useEffect, useCallback } from 'react';
import { playbackManager } from '@/lib/services/client/playback-manager';
import { VoicePlaybackState, VoicePlaybackMessage } from '@/lib/types/voice-playback';

export function useMessagePlayback(spaceId: string) {
  const [playbackState, setPlaybackState] = useState<VoicePlaybackState>(
    playbackManager.getPlaybackState()
  );

  // Update state when playback changes
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaybackState(playbackManager.getPlaybackState());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Start playback of messages
  const startPlayback = useCallback(async (messages: VoicePlaybackMessage[]) => {
    await playbackManager.startPlayback(messages, spaceId);
    setPlaybackState(playbackManager.getPlaybackState());
  }, [spaceId]);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    await playbackManager.stopPlayback();
    setPlaybackState(playbackManager.getPlaybackState());
  }, []);

  // Pause playback
  const pausePlayback = useCallback(async () => {
    await playbackManager.pausePlayback();
    setPlaybackState(playbackManager.getPlaybackState());
  }, []);

  // Resume playback
  const resumePlayback = useCallback(async () => {
    await playbackManager.resumePlayback();
    setPlaybackState(playbackManager.getPlaybackState());
  }, []);

  // Skip to specific message
  const skipToMessage = useCallback(async (messageId: string) => {
    await playbackManager.skipToMessage(messageId);
    setPlaybackState(playbackManager.getPlaybackState());
  }, []);

  return {
    playbackState,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    skipToMessage,
    isPlaying: playbackState.isPlaying,
    currentMessageId: playbackState.currentMessageId
  };
} 