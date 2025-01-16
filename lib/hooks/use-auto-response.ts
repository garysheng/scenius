import { useEffect, useRef } from 'react';
import { MessageFrontend } from '@/types';

const AUTO_RESPONSE_DELAY = 10000; // 10 seconds
const GARY_USER_ID = process.env.NEXT_PUBLIC_GARY_USER_ID;

export function useAutoResponse(
  messages: MessageFrontend[],
  spaceId: string,
  channelId: string,
  isGaryDM: boolean
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔄 [AutoResponse] Messages changed:', {
      messageCount: messages.length,
      spaceId,
      channelId,
      isGaryDM,
      GARY_USER_ID
    });

    // Clear any existing timeout when messages change
    if (timeoutRef.current) {
      console.log('⏱️ [AutoResponse] Clearing existing timeout');
      clearTimeout(timeoutRef.current);
    }

    // Only proceed if this is a DM with Gary
    if (!isGaryDM) {
      console.log('🚫 [AutoResponse] Skipping - Not a Gary DM');
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
      timestamp: latestMessage.createdAt
    });

    // Don't respond to Gary's own messages
    if (latestMessage.userId === GARY_USER_ID) {
      console.log('🚫 [AutoResponse] Skipping - Message is from Gary');
      return;
    }

    console.log(`⏳ [AutoResponse] Starting ${AUTO_RESPONSE_DELAY}ms timer for response`);

    // Set timeout for auto-response
    timeoutRef.current = setTimeout(async () => {
      console.log('🎬 [AutoResponse] Timer complete, generating response');
      try {
        const response = await fetch('/api/auto-response', {
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
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate response');
        }

        console.log('✅ [AutoResponse] Response generated and sent successfully');
      } catch (error) {
        console.error('❌ [AutoResponse] Error generating response:', error);
      }
    }, AUTO_RESPONSE_DELAY);

    // Cleanup timeout on unmount or when messages change
    return () => {
      if (timeoutRef.current) {
        console.log('🧹 [AutoResponse] Cleanup - clearing timeout');
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messages, spaceId, channelId, isGaryDM]);
} 