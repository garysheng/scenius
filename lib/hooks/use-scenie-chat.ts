import { useState, useEffect, useCallback } from 'react';
import { useChat, Message as AiMessage } from 'ai/react';
import { ElevenLabsClient, play } from 'elevenlabs';
import {
  UseScenieChatOptions,
  UseScenieChatReturn,
  ScenieMessage,
  ScenieChatMode,
} from '@/types/dm-scenie';

const ELEVEN_LABS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY!,
  voiceId: process.env.NEXT_PUBLIC_ELEVEN_LABS_VOICE_ID!,
  model: 'eleven_multilingual_v2' as const,
  voice: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
};

export function useScenieChatHook({
  spaceId,
  channelId,
  userId,
  onModeChange,
}: UseScenieChatOptions): UseScenieChatReturn {
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [elevenlabsClient, setElevenlabsClient] = useState<ElevenLabsClient | null>(null);

  // Initialize Eleven Labs client for voice
  useEffect(() => {
    if (!elevenlabsClient && ELEVEN_LABS_CONFIG.apiKey) {
      setElevenlabsClient(new ElevenLabsClient({
        apiKey: ELEVEN_LABS_CONFIG.apiKey,
      }));
    }
  }, [elevenlabsClient]);

  // Use Vercel's AI SDK for chat
  const {
    messages: aiMessages,
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
      // Generate and play audio for Scenie's response
      if (elevenlabsClient && message.role === 'assistant') {
        try {
          const audio = await elevenlabsClient.generate({
            voice: ELEVEN_LABS_CONFIG.voiceId,
            text: message.content,
            model_id: ELEVEN_LABS_CONFIG.model,
            voice_settings: ELEVEN_LABS_CONFIG.voice,
          });
          await play(audio);
        } catch (err) {
          console.error('Failed to generate audio:', err);
        }
      }
    },
  });

  // Convert AI SDK messages to Scenie messages
  const messages: ScenieMessage[] = aiMessages.map((m: AiMessage) => ({
    id: m.id,
    content: m.content,
    timestamp: new Date(),
    sender: m.role === 'user' ? 'user' : 'scenie',
    mode: 'text',
  }));

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    console.log('Sending message:', content);
    try {
      await append({
        content,
        role: 'user',
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [append]);

  const startVoiceChat = useCallback(async (): Promise<void> => {
    setIsVoiceChatActive(true);
  }, []);

  const stopVoiceChat = useCallback(async (): Promise<void> => {
    setIsVoiceChatActive(false);
  }, []);

  const switchMode = useCallback((newMode: ScenieChatMode): void => {
    onModeChange?.(newMode);
  }, [onModeChange]);

  // Log messages for debugging
  useEffect(() => {
    console.log('Current messages:', messages);
  }, [messages]);

  return {
    messages,
    isLoading,
    error: aiError || null,
    sendMessage,
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
    switchMode,
  };
} 