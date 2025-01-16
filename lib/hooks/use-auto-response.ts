import { useEffect, useRef } from 'react';
import { MessageFrontend } from '@/types';

const AUTO_RESPONSE_DELAY = 30000; // 30 seconds
const API_TIMEOUT = 300000; // 5 minutes

// Helper function to timeout a fetch call
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export function useAutoResponse(
  messages: MessageFrontend[],
  spaceId: string,
  channelId: string,
  isDM: boolean
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔄 [AutoResponse] Messages changed:', {
      messageCount: messages.length,
      spaceId,
      channelId,
      isDM
    });

    // Clear any existing timeout when messages change
    if (timeoutRef.current) {
      console.log('⏱️ [AutoResponse] Clearing existing timeout');
      clearTimeout(timeoutRef.current);
    }

    // Only proceed if this is a DM
    if (!isDM) {
      console.log('🚫 [AutoResponse] Skipping - Not a DM');
      return;
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      console.log('🚫 [AutoResponse] Skipping - No messages');
      return;
    }

    console.log('📝 [AutoResponse] Latest message:', {
      id: latestMessage.id,
      content: latestMessage.content,
      userId: latestMessage.userId,
      type: latestMessage.type,
      hasAttachments: !!latestMessage.metadata?.attachments?.length,
      timestamp: latestMessage.createdAt
    });

    // Skip if the latest message has a video attachment
    if (latestMessage.metadata?.attachments?.some(a => a.mimeType?.startsWith('video/'))) {
      console.log('🚫 [AutoResponse] Skipping - Latest message has a video attachment');
      return;
    }

    console.log(`⏳ [AutoResponse] Starting ${AUTO_RESPONSE_DELAY}ms timer for response`);

    // Set timeout for auto-response
    timeoutRef.current = setTimeout(async () => {
      console.log('🎬 [AutoResponse] Timer complete, generating response');
      try {
        const response = await fetchWithTimeout('/api/auto-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spaceId,
            channelId,
            message: latestMessage.content,
            userId: latestMessage.userId
          }),
        }, API_TIMEOUT);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate response');
        }

        console.log('✅ [AutoResponse] Response generated and sent successfully');
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('❌ [AutoResponse] Request timed out after', API_TIMEOUT / 1000, 'seconds');
          } else {
            console.error('❌ [AutoResponse] Error generating response:', error.message);
          }
        } else {
          console.error('❌ [AutoResponse] Unknown error generating response');
        }
      }
    }, AUTO_RESPONSE_DELAY);

    // Cleanup timeout on unmount or when messages change
    return () => {
      if (timeoutRef.current) {
        console.log('🧹 [AutoResponse] Cleanup - clearing timeout');
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messages, spaceId, channelId, isDM]);
}