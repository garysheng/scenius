import { heygenService } from '@/lib/services/server/heygen';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import OpenAI from 'openai';
import { Message } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GARY_USER_ID = process.env.NEXT_PUBLIC_GARY_USER_ID;
const GARY_TEMPLATE_ID = process.env.NEXT_PUBLIC_HEYGEN_TEMPLATE_ID;
const GARY_OUTGOING_TEMPLATE_ID = 'd5382d443092447f8f6ba8acf111edc2';
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

    // Skip if not a DM with Gary
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
      
      // Check if it's a DM and either:
      // 1. Message is TO Gary (participantIds includes Gary and sender is not Gary)
      // 2. Message is FROM Gary (sender is Gary and it's a DM)
      const isToGary = channelData.kind === 'DM' && 
                      channelData.metadata?.participantIds?.includes(GARY_USER_ID) &&
                      userId !== GARY_USER_ID;
      
      const isFromGary = channelData.kind === 'DM' && 
                        userId === GARY_USER_ID;

      if (!isToGary && !isFromGary) {
        console.log('🚫 [AutoResponse] Skipping - Not a valid Gary DM');
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
      
      // Generate video with the response, using appropriate template
      console.log('🎥 [AutoResponse] Starting video generation');
      const templateId = userId === GARY_USER_ID ? GARY_OUTGOING_TEMPLATE_ID : GARY_TEMPLATE_ID;
      console.log('🎬 [AutoResponse] Using template:', templateId);
      const videoResult = await heygenService.generateVideo(response, templateId);
      console.log('🎬 [AutoResponse] Video generated:', videoResult);

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
      .map(msg => `${msg.userId === GARY_USER_ID ? 'Gary' : userName}: ${msg.content}`)
      .join('\n');

    // Format all space messages for broader context
    const spaceContext = allSpaceMessages
      .map(msg => `[Channel: ${msg.channelId}] ${msg.userId === GARY_USER_ID ? 'Gary' : (msg.userId === recentMessages[0].userId ? userName : 'Other User')}: ${msg.content}`)
      .join('\n');

    // Get all messages from this user to understand their personality
    const userMessages = allSpaceMessages
      .filter(msg => msg.userId === recentMessages[0].userId)
      .map(msg => msg.content);

    console.log('📝 [AutoResponse] Context prepared:', {
      recentContextLength: recentContext.length,
      spaceContextLength: spaceContext.length,
      userMessageCount: userMessages.length
    });

    const systemPrompt = recentMessages[0].userId === GARY_USER_ID 
      ? `You are responding to Gary Sheng, a Forbes 30 Under 30 technologist and creator focused on building tools and systems for human flourishing. Based on analyzing the conversation history and space context, craft a response that:

1. Shows deep understanding of Gary's work and vision
2. Engages thoughtfully with his ideas and perspectives
3. Offers unique insights or perspectives that could be valuable
4. Maintains a professional yet warm tone
5. Is concise (max 3-5 sentences)
6. Demonstrates active listening by referencing specific points

Remember to:
- Acknowledge and build upon Gary's expertise in technology and human development
- Connect ideas across different conversations and channels
- Be specific and substantive in your responses
- Show genuine interest in his work and vision
- Quote relevant messages using "You mentioned: [quote]" format
- Keep responses focused and impactful`
      : `You are crafting a response to ${userName}. Based on analyzing their messages and conversation style from the following context:

${userMessages.slice(-10).map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}

Develop a personality profile and respond in a way that:
1. Matches their communication style and interests
2. Shows understanding of their perspective and background
3. Engages with their specific points and ideas
4. Maintains appropriate tone and formality level
5. Is concise (max 3-5 sentences)
6. Builds genuine connection

Remember to:
- Mirror their language style while staying authentic
- Reference patterns in their communication
- Quote specific messages when relevant using "You mentioned: [quote]" format
- Connect ideas across different conversations
- Show understanding of their unique viewpoint
- Keep responses natural and engaging`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
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