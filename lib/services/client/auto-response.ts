const GARY_USER_ID = process.env.NEXT_PUBLIC_GARY_USER_ID;

interface AutoResponseState {
  pendingResponses: Set<string>;
}

const state: AutoResponseState = {
  pendingResponses: new Set()
};

export const autoResponseService = {
  async handleIncomingMessage(
    spaceId: string,
    channelId: string,
    messageContent: string,
    userId: string,
    options: { isTest?: boolean } = {}
  ) {
    console.log('🚀 [Client] Starting auto-response:', {
      spaceId,
      channelId,
      messageLength: messageContent.length,
      userId,
      isTest: options?.isTest,
      GARY_USER_ID
    });

    // Only process DMs to Gary
    if (userId === GARY_USER_ID) {
      console.log('🚫 [Client] Skipping - Message is from Gary');
      return;
    }

    // Prevent duplicate responses
    const messageKey = `${spaceId}:${channelId}:${messageContent}`;
    if (state.pendingResponses.has(messageKey)) {
      console.log('🔄 [Client] Response already pending for this message');
      return;
    }

    state.pendingResponses.add(messageKey);
    console.log('✅ [Client] Added to pending responses:', messageKey);

    try {
      console.log('🎬 [Client] Calling auto-response API');
      
      // Call server endpoint for video generation
      const response = await fetch('/api/auto-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId,
          channelId,
          message: messageContent,
          userId
        }),
      });

      console.log('📥 [Client] API response status:', response.status);
      const data = await response.json();
      console.log('📦 [Client] API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      return data;
    } catch (error) {
      console.error('❌ [Client] Auto-response error:', error);
      throw error;
    } finally {
      state.pendingResponses.delete(messageKey);
      console.log('🧹 [Client] Removed from pending responses:', messageKey);
    }
  }
}; 