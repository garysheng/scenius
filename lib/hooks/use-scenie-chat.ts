/**
 * A custom hook that manages chat interactions with Scenie AI assistant, including:
 * - Text and voice-based conversations
 * - Message persistence and real-time updates
 * - Voice synthesis using ElevenLabs
 * - Integration with Vercel's AI SDK for chat functionality
 * - Mode switching between text/voice chat
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from 'ai/react';
import {
  UseScenieChatOptions,
  UseScenieChatReturn,
  ScenieMessage,
  ScenieChatMode,
} from '@/types/dm-scenie';
import { scenieService } from '@/lib/services/client/scenie';

export function useScenieChatHook({
  spaceId,
  channelId,
  userId,
  onModeChange,
}: UseScenieChatOptions): UseScenieChatReturn {
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [persistedMessages, setPersistedMessages] = useState<ScenieMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio player
  useEffect(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
  }, []);

  const stopTTS = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
  }, []);

  // Load initial messages and subscribe to updates
  useEffect(() => {
    if (!spaceId || !userId) return;

    // Initialize or get conversation
    const initializeChat = async () => {
      await scenieService.getOrCreateConversation(spaceId, userId);
      const messages = await scenieService.getMessages(spaceId, userId);
      setPersistedMessages(messages);
    };

    initializeChat();

    // Subscribe to message updates
    const unsubscribe = scenieService.subscribeToMessages(spaceId, userId, (messages) => {
      setPersistedMessages(messages);
    });

    return () => unsubscribe();
  }, [spaceId, userId]);

  // Use Vercel's AI SDK for chat
  const {
    isLoading,
    error: aiError,
    append,
  } = useChat({
    api: '/api/scenie/chat',
    initialMessages: [],
    body: {
      spaceId,
      channelId,
      userId,
    },
    onResponse: (response) => {
      console.log('API Response:', response);
    },
    onFinish: async (message) => {
      console.log('Message finished:', message);

      // Persist the assistant's message
      if (message.role === 'assistant' && spaceId && userId) {
        const assistantMessage = await scenieService.addMessage(spaceId, userId, {
          content: message.content,
          sender: 'scenie',
          mode: 'text'
        });

        // Emit a custom event for the UI to scroll to the new message
        const scrollEvent = new CustomEvent('newMessage', { detail: { messageId: assistantMessage.id } });
        window.dispatchEvent(scrollEvent);

        // Generate and play audio for Scenie's response using our API
        try {
          const response = await fetch('/api/tts-11labs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: message.content
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const audioBlob = await response.blob();
          const url = URL.createObjectURL(audioBlob);

          if (audioPlayerRef.current) {
            // Stop any currently playing audio
            stopTTS();
            // Play the new audio
            audioPlayerRef.current.src = url;
            await audioPlayerRef.current.play();
            
            // Clean up the URL after playing
            audioPlayerRef.current.onended = () => {
              URL.revokeObjectURL(url);
            };
          }
        } catch (error: unknown) {
          console.error('Failed to generate or play audio:', error);
          if (error && typeof error === 'object' && 'response' in error) {
            const err = error as { response?: { data: unknown } };
            console.log('Error details:', err.response?.data || error);
          } else {
            console.log('Error details:', error);
          }
        }
      }
    },
  });

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    console.log('Sending message:', content);
    if (!spaceId || !userId) {
      console.error('Missing spaceId or userId');
      return;
    }

    try {
      // Persist the user's message first
      const userMessage = await scenieService.addMessage(spaceId, userId, {
        content,
        sender: 'user',
        mode: 'text'
      });

      // Emit a custom event for the UI to scroll to the new message
      const scrollEvent = new CustomEvent('newMessage', { detail: { messageId: userMessage.id } });
      window.dispatchEvent(scrollEvent);

      // Then send to AI
      await append({
        content,
        role: 'user',
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [append, spaceId, userId]);

  const startVoiceChat = useCallback(async (): Promise<void> => {
    try {
      // Stop any ongoing TTS playback
      stopTTS();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = []; // Clear for next recording

        // Convert audio to text using OpenAI Whisper
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('prompt', 'This transcript may contain the word "Scenie" (pronounced "SEE-nee"), which is the name of an AI assistant.');

        try {
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to transcribe audio');
          }

          const data = await response.json();
          // Replace common misspellings of Scenie
          const correctedText = data.text.replace(/\b(seeny|seenie|scene-e|scene e|scenic)\b/gi, 'Scenie');
          if (correctedText) {
            await sendMessage(correctedText);
          }
        } catch (err) {
          console.error('Error transcribing audio:', err);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsVoiceChatActive(true);
    } catch (err) {
      console.error('Error starting voice chat:', err);
    }
  }, [stopTTS, sendMessage]);

  const stopVoiceChat = useCallback(async (): Promise<void> => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsVoiceChatActive(false);
  }, []);

  const switchMode = useCallback((newMode: ScenieChatMode): void => {
    onModeChange?.(newMode);
  }, [onModeChange]);

  const clearMessages = useCallback(async (): Promise<void> => {
    if (!spaceId || !userId) {
      console.error('Missing spaceId or userId');
      return;
    }

    try {
      await scenieService.clearMessages(spaceId, userId);
      setPersistedMessages([]); // Clear local state
    } catch (err) {
      console.error('Error clearing messages:', err);
    }
  }, [spaceId, userId]);

  // Return persisted messages instead of AI SDK messages
  return {
    messages: persistedMessages,
    isLoading,
    error: aiError || null,
    sendMessage,
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
    switchMode,
    clearMessages,
    stopTTS,
  };
} 