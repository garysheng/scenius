import { heygenService } from '@/lib/services/server/heygen';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import OpenAI from 'openai';
import { Message } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GARY_USER_ID = process.env.NEXT_PUBLIC_GARY_USER_ID;
const AUTO_RESPONSE_COOLDOWN = 3600000; // 1 hour in milliseconds
const lastResponseTime: Record<string, number> = {};
const pendingResponses: Record<string, boolean> = {};

export const autoResponseService = {
  async handleIncomingMessage(
    spaceId: string,
    channelId: string,
    triggerMessage: string,
    userId: string,
    options?: { isTest?: boolean }
  ) {
    console.log('🚀 [AutoResponse] Starting message handler:', {
      spaceId,
      channelId,
      messageLength: triggerMessage.length,
      userId,
      isTest: options?.isTest
    });

    // Skip if not a DM with Gary or if it's Gary's own message
    if (!options?.isTest) {
      console.log('🔍 [AutoResponse] Checking channel type and permissions');
      const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        console.log('🚫 [AutoResponse] Channel not found');
        return;
      }

      const channelData = channelDoc.data();
      console.log('📋 [AutoResponse] Channel data:', {
        kind: channelData.kind,
        hasParticipants: !!channelData.metadata?.participantIds,
        participantCount: channelData.metadata?.participantIds?.length
      });
      
      if (channelData.kind !== 'DM' || 
          !channelData.metadata?.participantIds?.includes(GARY_USER_ID) ||
          userId === GARY_USER_ID) {
        console.log('🚫 [AutoResponse] Skipping - Not a valid Gary DM');
        return;
      }

      // Check cooldown
      const now = Date.now();
      const lastResponse = lastResponseTime[channelId] || 0;
      const timeSinceLastResponse = now - lastResponse;
      console.log('⏲️ [AutoResponse] Checking cooldown:', {
        lastResponse,
        timeSinceLastResponse,
        cooldownPeriod: AUTO_RESPONSE_COOLDOWN,
        isInCooldown: timeSinceLastResponse < AUTO_RESPONSE_COOLDOWN
      });

      if (timeSinceLastResponse < AUTO_RESPONSE_COOLDOWN) {
        console.log('🚫 [AutoResponse] Skipping - Cooldown active');
        return;
      }

      // Check if response is already pending
      console.log('🔄 [AutoResponse] Checking pending status:', {
        isPending: pendingResponses[channelId]
      });
      if (pendingResponses[channelId]) {
        console.log('🚫 [AutoResponse] Skipping - Response already pending');
        return;
      }

      pendingResponses[channelId] = true;
    }

    try {
      // Get all messages from all channels in the space
      console.log('📚 [AutoResponse] Fetching all space messages');
      const allChannelsRef = collection(db, 'spaces', spaceId, 'channels');
      const allChannelsSnapshot = await getDocs(allChannelsRef);
      
      const allMessages: Message[] = [];
      for (const channelDoc of allChannelsSnapshot.docs) {
        const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelDoc.id, 'messages');
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const channelMessages = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            channelId: channelDoc.id,
            content: data.content,
            userId: data.userId,
            type: data.type || 'TEXT',
            threadId: data.threadId || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            metadata: {
              reactions: data.metadata?.reactions || {},
              edited: data.metadata?.edited || false,
              attachments: data.metadata?.attachments || [],
              threadInfo: data.metadata?.threadInfo || {
                replyCount: 0,
                lastReplyAt: null,
                participantIds: []
              }
            }
          } as Message;
        });
        
        allMessages.push(...channelMessages);
      }

      // Sort all messages by timestamp
      allMessages.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return aTime - bTime;
      });

      console.log('📝 [AutoResponse] All space messages:', {
        totalCount: allMessages.length,
        channelCount: allChannelsSnapshot.size
      });

      // Get recent messages from current channel for immediate context
      console.log('📚 [AutoResponse] Fetching recent channel messages');
      const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const recentMessages = messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          channelId,
          content: data.content,
          userId: data.userId,
          type: data.type || 'TEXT',
          threadId: data.threadId || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          metadata: {
            reactions: data.metadata?.reactions || {},
            edited: data.metadata?.edited || false,
            attachments: data.metadata?.attachments || [],
            threadInfo: data.metadata?.threadInfo || {
              replyCount: 0,
              lastReplyAt: null,
              participantIds: []
            }
          }
        } as Message;
      });
      
      recentMessages.reverse();
      console.log('📝 [AutoResponse] Recent messages:', {
        count: recentMessages.length,
        messageIds: recentMessages.map(m => m.id)
      });

      // Get user details
      console.log('👤 [AutoResponse] Fetching user details');
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const userName = userData?.username || userData?.fullName || 'there';
      console.log('👤 [AutoResponse] User info:', {
        userId,
        userName,
        hasUserData: !!userData
      });

      // Generate a contextual response
      console.log('💭 [AutoResponse] Generating response');
      const response = await this.generateResponse(triggerMessage, userName, recentMessages, allMessages);
      console.log('✍️ [AutoResponse] Generated response:', {
        length: response.length,
        response: response
      });
      
      // Generate video with the response
      console.log('🎥 [AutoResponse] Starting video generation');
      const videoResult = await heygenService.generateVideo(response);
      console.log('🎬 [AutoResponse] Video generated:', videoResult);

      if (!options?.isTest) {
        // Update cooldown
        console.log('⏲️ [AutoResponse] Updating cooldown timestamp');
        lastResponseTime[channelId] = Date.now();
      }

      console.log('✅ [AutoResponse] Message handler completed successfully');
      return {
        ...videoResult,
        transcript: response
      };
    } catch (error) {
      console.error('❌ [AutoResponse] Error in message handler:', error);
      throw error;
    } finally {
      if (!options?.isTest) {
        console.log('🧹 [AutoResponse] Cleaning up pending status');
        pendingResponses[channelId] = false;
      }
    }
  },

  async generateResponse(
    triggerMessage: string,
    userName: string,
    recentMessages: Message[],
    allSpaceMessages: Message[]
  ): Promise<string> {
    console.log('🤖 [AutoResponse] Starting response generation:', {
      triggerLength: triggerMessage.length,
      userName,
      contextMessageCount: recentMessages.length,
      totalSpaceMessages: allSpaceMessages.length
    });

    // Format recent messages for immediate context
    const recentContext = recentMessages
      .map(msg => `${msg.userId === GARY_USER_ID ? 'Gary' : 'User'}: ${msg.content}`)
      .join('\n');

    // Format all space messages for broader context
    const spaceContext = allSpaceMessages
      .map(msg => `[Channel: ${msg.channelId}] ${msg.userId === GARY_USER_ID ? 'Gary' : 'User'}: ${msg.content}`)
      .join('\n');

    console.log('📝 [AutoResponse] Context prepared:', {
      recentContextLength: recentContext.length,
      spaceContextLength: spaceContext.length
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are Gary Sheng, a Forbes 30 Under 30 technologist and creator focused on building tools and systems for human flourishing. You're having a conversation with ${userName}.

Your responses should be:
1. Natural and conversational
2. Informed by both the immediate context and broader space history
3. Aligned with your expertise in technology and human development
4. Engaging and thought-provoking
5. Concise (max 3-5 sentences)
6. Focused on building genuine connection

Remember to:
- Show genuine interest in the user's perspective
- Share relevant insights from your experience
- Keep the tone warm and professional
- Avoid generic platitudes
- Be specific and personal in your responses
- Quote specific messages from the conversation or Space or channel history when relevant, using "You mentioned earlier: [quote]" format
- Draw connections between current and past messages to show active listening
- Reference and build upon themes from previous conversations`
        },
        {
          role: "user", 
          content: `Space history:\n${spaceContext}\n\nRecent conversation:\n${recentContext}\n\n${userName} just said: "${triggerMessage}"\n\nRespond naturally, quoting relevant messages if appropriate:`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Failed to generate response');
    }

    console.log('💬 [AutoResponse] Response generated:', {
      responseLength: response.length,
      response: response
    });

    return response;
  }
};