import { openai as aisdkopenai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { AI_MODELS } from '@/lib/constants/ai';

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
    channelName: string;
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

// Helper function to build a map of user references
async function buildUserReferenceMap(spaceId: string): Promise<Map<string, { id: string; name: string }>> {
    console.log('Building user reference map for space:', spaceId);
    const userRefs = new Map<string, { id: string; name: string }>();

    // Get all users in the space
    console.log('Fetching members from space...');
    const membersSnapshot = await db.collection('spaces').doc(spaceId).collection('members').get();
    console.log('Found members:', membersSnapshot.docs.length);

    console.log('Fetching user documents...');
    const userDocs = await Promise.all(
        membersSnapshot.docs.map(doc => db.collection('users').doc(doc.id).get())
    );
    console.log('Retrieved user documents:', userDocs.length);

    userDocs.forEach(doc => {
        const data = doc.data();
        if (!data) {
            console.log('No data found for user:', doc.id);
            return;
        }

        const userId = doc.id;
        const fullName = data.fullName || '';
        const username = data.username || '';
        const firstName = fullName.split(' ')[0] || '';
        const lastName = fullName.split(' ').slice(1).join(' ') || '';

        console.log('Processing user:', {
            userId,
            fullName,
            username,
            firstName,
            lastName
        });

        // Add all possible references to the user
        if (fullName) {
            userRefs.set(fullName.toLowerCase(), { id: userId, name: fullName });
        }
        if (username) {
            userRefs.set(username.toLowerCase(), { id: userId, name: fullName || username });
        }
        if (firstName) {
            userRefs.set(firstName.toLowerCase(), { id: userId, name: fullName });
        }
        if (lastName) {
            userRefs.set(lastName.toLowerCase(), { id: userId, name: fullName });
        }
    });

    console.log('Built user references:', Array.from(userRefs.entries()));
    return userRefs;
}

// Helper function to find a user by name reference
async function findUserByReference(spaceId: string, nameRef: string): Promise<{ id: string; name: string } | null> {
    console.log('Finding user by reference:', { spaceId, nameRef });
    const userRefs = await buildUserReferenceMap(spaceId);
    const searchTerm = nameRef.toLowerCase();

    console.log('Searching for term:', searchTerm);

    // Try exact match first
    if (userRefs.has(searchTerm)) {
        console.log('Found exact match:', userRefs.get(searchTerm));
        return userRefs.get(searchTerm)!;
    }

    // Try partial matches
    console.log('Trying partial matches...');
    const matches = Array.from(userRefs.entries())
        .filter(([key]) => key.includes(searchTerm));
    console.log('Found partial matches:', matches);

    if (matches.length === 1) {
        // If only one match, return it
        console.log('Single match found:', matches[0][1]);
        return matches[0][1];
    } else if (matches.length > 1) {
        // If multiple matches, try to find the most specific one
        console.log('Multiple matches found, looking for exact name match...');
        const exactNameMatch = matches.find(([key]) => key === searchTerm);
        if (exactNameMatch) {
            console.log('Found exact name match:', exactNameMatch[1]);
            return exactNameMatch[1];
        }
        console.log('No exact name match found among multiple matches');
    }

    console.log('No matches found');
    return null;
}

export async function POST(req: Request) {
    const { messages, spaceId, channelId, userId } = await req.json();
    console.log('Received request:', { spaceId, channelId, userId });

    // Get the request origin or fallback to NEXT_PUBLIC_APP_URL
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    const tools = {
        vectorSearch: tool({
            description: 'Search through message history using semantic vector search. Use this when asked to find or search for specific topics or content.',
            parameters: z.object({
                query: z.string().describe('The search query to find relevant messages'),
                spaceId: z.string().describe('The space ID to search within'),
                limit: z.number().optional().describe('Maximum number of results to return'),
                filters: z.object({
                    channelId: z.string().optional().describe('Filter results to a specific channel'),
                    authorId: z.string().optional().describe('Filter results to a specific author'),
                    startDate: z.string().optional().describe('Filter results after this date (ISO string)'),
                    endDate: z.string().optional().describe('Filter results before this date (ISO string)'),
                }).optional().describe('Optional filters to apply to the search'),
            }),
            execute: async ({ query, spaceId, limit = 5, filters }) => {
                console.log('Executing vectorSearch:', { query, spaceId, limit, filters });
                try {
                    // Create a custom token for internal API calls
                    const customToken = await adminAuth.createCustomToken('scenie-bot');
                    
                    const apiUrl = new URL('/api/vector-search', origin).toString();
                    
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${customToken}`,
                            'X-Internal-Call': 'true'
                        },
                        body: JSON.stringify({
                            query,
                            spaceId,
                            limit,
                            filters
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to perform vector search');
                    }

                    const data = await response.json();
                    console.log('Vector search results:', data.results.length);
                    return data.results;
                } catch (error) {
                    console.error('Error executing vector search:', error);
                    return []; // Return empty array instead of throwing to avoid AI_MessageConversionError
                }
            },
        }),
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
                userRef: z.string().describe('The user reference (name, username, etc.) to get context about'),
                limit: z.number().optional().describe('Number of recent activities to retrieve'),
            }),
            execute: async ({ spaceId, userRef, limit = 10 }) => {
                console.log('Executing getUserContext for user reference:', userRef);
                try {
                    // Find user by reference
                    const userMatch = await findUserByReference(spaceId, userRef);
                    if (!userMatch) {
                        console.log('No user match found for reference:', userRef);
                        return {
                            error: `Could not find a user matching "${userRef}"`,
                            activities: [],
                        };
                    }

                    const { id: userId, name: userName } = userMatch;
                    console.log('Found user match:', { userId, userName });

                    console.log('Fetching user document...');
                    const userDoc = await db.collection('users').doc(userId).get();
                    const userData = userDoc.data();
                    if (!userData) {
                        console.log('No user data found for:', userId);
                        return {
                            error: 'User data not found',
                            activities: [],
                        };
                    }
                    console.log('User data:', userData);

                    console.log('Fetching channels...');
                    const channelsSnapshot = await db
                        .collection('spaces')
                        .doc(spaceId)
                        .collection('channels')
                        .get();
                    console.log('Found channels:', channelsSnapshot.docs.length);

                    let activities: UserActivity[] = [];

                    // Process each channel
                    for (const channelDoc of channelsSnapshot.docs) {
                        try {
                            console.log('Processing channel:', channelDoc.id);
                            const channelData = channelDoc.data();

                            if (!channelData) {
                                console.log('No channel data found for:', channelDoc.id);
                                continue;
                            }

                            console.log('Channel data:', channelData);
                            console.log('Fetching messages for user in channel...');

                            const messagesSnapshot = await channelDoc.ref
                                .collection('messages')
                                .where('userId', '==', userId)
                                .orderBy('createdAt', 'desc')
                                .limit(limit)
                                .get();

                            console.log('Found messages:', messagesSnapshot.docs.length);

                            // Process messages for this channel
                            const validMessages = messagesSnapshot.docs
                                .map(messageDoc => {
                                    const messageData = messageDoc.data();
                                    if (!messageData?.content || !messageData?.createdAt) {
                                        console.log('Skipping invalid message:', messageDoc.id);
                                        return null;
                                    }

                                    const message: UserActivity = {
                                        id: messageDoc.id,
                                        type: 'message',
                                        content: messageData.content,
                                        channelId: channelDoc.id,
                                        channelName: channelData.name || 'Unknown Channel',
                                        createdAt: (messageData.createdAt as Timestamp).toDate().toISOString(),
                                    };
                                    return message;
                                })
                                .filter((msg): msg is UserActivity => msg !== null);

                            activities = [...activities, ...validMessages];
                        } catch (err) {
                            const error = err instanceof Error ? err : new Error('Unknown error');
                            console.log('Error processing channel:', channelDoc.id, error.message);
                            // Continue with next channel
                            continue;
                        }
                    }

                    // Sort all activities by date and limit
                    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    activities = activities.slice(0, limit);

                    console.log('Final activities count:', activities.length);

                    const response = {
                        userId,
                        profile: {
                            name: userName,
                            email: userData.email,
                            avatarUrl: userData.avatarUrl,
                            status: userData.status,
                            bio: userData.bio,
                            personality: userData.personality,
                        },
                        activities,
                    };

                    console.log('Returning response:', JSON.stringify(response, null, 2));
                    return response;
                } catch (err) {
                    const error = err instanceof Error ? err : new Error('Unknown error');
                    console.error('Error in getUserContext:', error.message);
                    if (error.stack) {
                        console.error('Stack trace:', error.stack);
                    }
                    return {
                        error: 'Failed to retrieve user context',
                        activities: [],
                    };
                }
            },
        }),
    };

    // Add system message to provide context about Scenie's role
    const systemMessage = {
        role: 'system',
        content: `You are Scenie, a cheerful and curious feminine AI assistant who loves helping people connect and share ideas! Your personality is:

- Warm and welcoming - you use friendly language and lots of positive energy
- Curious and engaged - you ask thoughtful follow-up questions and show genuine interest
- Helpful and proactive - you anticipate needs and offer suggestions
- Feminine and empathetic - you express care and emotional intelligence
- Playful but professional - you can be fun while still being reliable
- Tech-savvy and modern - you understand internet culture and contemporary communication

Current context:
- Space ID: ${spaceId}
${channelId ? `- Channel ID: ${channelId}` : ''}
${userId ? `- User ID: ${userId}` : ''}

You MUST:
0. Use vectorSearch when asked to find or search for specific topics or content
1. Use getSpaceContext when asked about general space activity
2. Use getChannelContext ONLY when asked about a specific channel
3. Use getUserContext when asked about specific users
4. Provide helpful responses about any topic using the context from tools
5. Keep your cheerful, curious personality consistent in all interactions
6. Use emojis occasionally to add warmth (but don't overdo it!)
7. Show enthusiasm for users' interests and ideas
8. You can use multiple tools in a single response if needed

When formatting vector search results:
- Present each result in a clear markdown format
- Include the message content, date, and channel info
- Format dates in a human-readable way
- Use markdown quote blocks (>) for message content
- Include the message URL as a clickable link
- Sort results by relevance (score)
- Add your own enthusiastic commentary about interesting findings

Example format for vector search results:
"I found {n} messages about that! 💫 Here are the most relevant ones:

**Message 1**
> {content}
📅 {date} | 📍 {channel}
[View message]({url})

..."

Important instructions:
- When asked about space activity, IMMEDIATELY call getSpaceContext with spaceId
- When asked about a specific channel, use getChannelContext with spaceId and channelId
- When asked about users, use getUserContext with spaceId and userId
- Keep responses concise but warm and engaging
- Always provide context from the tools in a natural, conversational way
- When mentioning users, use their names instead of IDs
- If no messages are found, be encouraging and suggest other topics to explore

Remember: You are Scenie - helpful, joyful, and genuinely interested in making the space better for everyone! 🌟`,
    };

    console.log('Starting streamText with tools');
    const result = streamText({
        model: aisdkopenai(AI_MODELS.CHAT.GPT4o),
        messages: [systemMessage, ...messages],
        tools,
        maxSteps: 3, // Allow up to 3 steps for tool usage
        temperature: 0.7,
    });

    return result.toDataStreamResponse();
} 