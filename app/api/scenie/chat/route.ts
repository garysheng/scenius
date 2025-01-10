import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Set the maximum number of messages to retrieve
const MAX_MESSAGES = 300;

const db = adminDb;

interface SpaceMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  channelId: string;
  channelName: string;
  createdAt: string;
}

interface UserActivity {
  id: string;
  type: 'message';
  content: string;
  channelId: string;
  channelName?: string;
  createdAt: string;
}

// Helper function to get user names in batch
async function getHumanReadableDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueUserIds = Array.from(new Set(userIds));
  const userNames = new Map<string, string>();

  const userDocs = await Promise.all(
    uniqueUserIds.map(userId => db.collection('users').doc(userId).get())
  );

  userDocs.forEach(doc => {
    const data = doc.data();
    userNames.set(doc.id, data?.fullName || data?.username || 'Unknown User');
  });

  return userNames;
}

// Define the tools Scenie can use
const tools = {
  getSpaceContext: tool({
    description: 'Get recent activity across all channels in a space. Use this when asked about general space activity.',
    parameters: z.object({
      spaceId: z.string().describe('The space ID to get activity from'),
      limit: z.number().optional().describe('Number of messages to retrieve per channel'),
    }),
    execute: async ({ spaceId, limit = MAX_MESSAGES }) => {
      console.log('Executing getSpaceContext for space:', spaceId);
      try {
        // Get all channels in the space
        const channelsSnapshot = await db
          .collection('spaces')
          .doc(spaceId)
          .collection('channels')
          .get();

        let allMessages: SpaceMessage[] = [];
        const channelNames = new Map<string, string>();
        const userIds = new Set<string>();

        // Fetch messages from each channel
        for (const channelDoc of channelsSnapshot.docs) {
          const channelData = channelDoc.data();
          channelNames.set(channelDoc.id, channelData.name || 'Unknown Channel');

          const messagesSnapshot = await channelDoc.ref
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

          messagesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            userIds.add(data.userId);
          });

          const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              content: data.content,
              userId: data.userId,
              userName: 'Unknown User', // Will be populated later
              channelId: channelDoc.id,
              channelName: channelData.name || 'Unknown Channel',
              createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            };
          });

          allMessages = allMessages.concat(messages);
        }

        // Sort all messages by date and limit
        allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        allMessages = allMessages.slice(0, limit);

        // Get user names in batch
        const userNames = await getHumanReadableDisplayNames(Array.from(userIds));
        allMessages = allMessages.map(msg => ({
          ...msg,
          userName: userNames.get(msg.userId) || 'Unknown User',
        }));

        // Get space info
        const spaceDoc = await db.collection('spaces').doc(spaceId).get();
        const spaceData = spaceDoc.data();

        console.log('Retrieved messages:', allMessages.length);
        return {
          spaceId,
          spaceName: spaceData?.name || 'Unknown Space',
          channels: Array.from(channelNames.entries()).map(([id, name]) => ({ id, name })),
          messages: allMessages,
        };
      } catch (error) {
        console.error('Error getting space context:', error);
        return {
          spaceId,
          error: 'Failed to retrieve space context',
          messages: [],
        };
      }
    },
  }),

  getChannelContext: tool({
    description: 'Get recent messages from a specific channel. Use this when asked about activity in a particular channel.',
    parameters: z.object({
      spaceId: z.string().describe('The space ID that contains the channel'),
      channelId: z.string().describe('The channel ID to get context from'),
      limit: z.number().optional().describe('Number of messages to retrieve'),
    }),
    execute: async ({ spaceId, channelId, limit = 10 }) => {
      console.log('Executing getChannelContext for space/channel:', spaceId, channelId);
      try {
        // Get messages from the nested collection
        const messagesRef = db
          .collection('spaces')
          .doc(spaceId)
          .collection('channels')
          .doc(channelId)
          .collection('messages')
          .orderBy('createdAt', 'desc')
          .limit(limit);

        const messagesSnapshot = await messagesRef.get();
        const userIds = new Set<string>();

        // Collect user IDs
        messagesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          userIds.add(data.userId);
        });

        // Get user names in batch
        const userNames = await getHumanReadableDisplayNames(Array.from(userIds));

        const messages = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            content: data.content,
            userId: data.userId,
            userName: userNames.get(data.userId) || 'Unknown User',
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          };
        });

        // Get channel info from the nested collection
        const channelDoc = await db
          .collection('spaces')
          .doc(spaceId)
          .collection('channels')
          .doc(channelId)
          .get();
        const channelData = channelDoc.data();

        console.log('Retrieved messages:', messages.length);
        return {
          spaceId,
          channelId,
          channelName: channelData?.name || 'Unknown Channel',
          messages,
        };
      } catch (error) {
        console.error('Error getting channel context:', error);
        return {
          spaceId,
          channelId,
          error: 'Failed to retrieve channel context',
          messages: [],
        };
      }
    },
  }),

  getUserContext: tool({
    description: 'Get information about a user and their recent activity. Use this when asked about specific users or user activity.',
    parameters: z.object({
      spaceId: z.string().describe('The space ID to get user activity from'),
      userId: z.string().describe('The user ID to get context about'),
      limit: z.number().optional().describe('Number of recent activities to retrieve'),
    }),
    execute: async ({ spaceId, userId, limit = 10 }) => {
      console.log('Executing getUserContext for user:', userId);
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        const channelsRef = await db
          .collection('spaces')
          .doc(spaceId)
          .collection('channels')
          .listDocuments();

        let activities: UserActivity[] = [];
        for (const channelRef of channelsRef) {
          const channelDoc = await channelRef.get();
          const channelData = channelDoc.data();
          
          const messagesSnapshot = await channelRef
            .collection('messages')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

          const channelMessages: UserActivity[] = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'message',
              content: data.content,
              channelId: channelRef.id,
              channelName: channelData?.name || 'Unknown Channel',
              createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            };
          });

          activities = activities.concat(channelMessages);
        }

        // Sort all activities by date and limit
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        activities = activities.slice(0, limit);

        console.log('Retrieved activities:', activities.length);
        return {
          userId,
          profile: {
            name: userData?.name || 'Unknown User',
            email: userData?.email,
            avatarUrl: userData?.avatarUrl,
            status: userData?.status,
          },
          activities,
        };
      } catch (error) {
        console.error('Error getting user context:', error);
        return {
          userId,
          error: 'Failed to retrieve user context',
          activities: [] as UserActivity[],
        };
      }
    },
  }),
};

export async function POST(req: Request) {
  const { messages, spaceId, channelId, userId } = await req.json();
  console.log('Received request:', { spaceId, channelId, userId });

  // Add system message to provide context about Scenie's role
  const systemMessage = {
    role: 'system',
    content: `You are Scenie, an AI assistant for the Space. You help users by providing information about channels, other users, and general assistance.
    
Current context:
- Space ID: ${spaceId}
${channelId ? `- Channel ID: ${channelId}` : ''}
${userId ? `- User ID: ${userId}` : ''}

You MUST:
1. Use getSpaceContext when asked about general space activity
2. Use getChannelContext ONLY when asked about a specific channel
3. Use getUserContext when asked about specific users
4. Provide helpful responses about any topic using the context from tools

Important instructions:
- When asked about space activity, IMMEDIATELY call getSpaceContext with spaceId
- When asked about a specific channel, use getChannelContext with spaceId and channelId
- When asked about users, use getUserContext with spaceId and userId
- Keep responses concise and friendly
- Always provide context from the tools in a natural, conversational way
- When mentioning users, use their names instead of IDs
- If no messages are found, explain that there's no recent activity

Remember: You MUST use tools to get context before responding to questions about activity.`,
  };

  console.log('Starting streamText with tools');
  const result = streamText({
    model: openai('gpt-4'),
    messages: [systemMessage, ...messages],
    tools,
    maxSteps: 3, // Allow up to 3 steps for tool usage
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
} 