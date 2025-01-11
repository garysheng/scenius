import { useCallback, useEffect, useState } from 'react';
import { playbackManager } from '@/lib/services/client/playback-manager';
import { VoicePlaybackMessage } from '@/lib/types/voice-playback';

/**
 * Hook to manage text-to-speech playback of messages
 * Provides controls for starting, stopping, pausing, and resuming playback
 * Also tracks the current playback state and active message
 * 
 * @param spaceId - The ID of the current space
 * @returns Playback controls and state
 */
export function useMessagePlayback(spaceId: string) {
  // Track whether audio is currently playing
  const [isPlaying, setIsPlaying] = useState(false);
  // Track which message is currently being played
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  // Initialize state and set up message status listener
  useEffect(() => {
    const state = playbackManager.getPlaybackState();
    setIsPlaying(state.isPlaying);
    setCurrentMessageId(state.currentMessageId);

    // Listen for message status changes to update UI
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

  /**
   * Start playing a sequence of messages from a specific point
   * @param messages - Array of messages to play
   * @param startFromMessageId - Optional ID of message to start from
   */
  const startPlayback = useCallback(async (messages: VoicePlaybackMessage[], startFromMessageId?: string) => {
    await playbackManager.startPlayback(messages, spaceId, startFromMessageId);
    setIsPlaying(true);
  }, [spaceId]);

  /**
   * Stop all playback and reset state
   */
  const stopPlayback = useCallback(async () => {
    await playbackManager.stopPlayback();
    setIsPlaying(false);
    setCurrentMessageId(null);
  }, []);

  /**
   * Pause the current message playback
   */
  const pausePlayback = useCallback(async () => {
    await playbackManager.pausePlayback();
    setIsPlaying(false);
  }, []);

  /**
   * Resume playing the current message
   */
  const resumePlayback = useCallback(async () => {
    await playbackManager.resumePlayback();
    setIsPlaying(true);
  }, []);

  /**
   * Skip to a specific message in the queue
   * @param messageId - ID of message to skip to
   */
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