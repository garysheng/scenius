import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  Timestamp, 
  limit,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatSummary, VoiceDictation } from '@/types/scenie';
import { ScenieMessage, ScenieConversation } from '@/types/dm-scenie';
import OpenAI from 'openai';
import { Message, MessageFrontend } from '@/types';
import { searchService } from './search';
import { usersService } from './users';
import { AI_MODELS } from '@/lib/constants/ai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const scenieService = {
  async generateChannelSummary(
    spaceId: string,
    channelId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ChatSummary> {
    console.log('Generating channel summary:', { spaceId, channelId, startTime, endTime });

    // Get messages for the specified time period
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('createdAt', '>=', startTime),
      where('createdAt', '<=', endTime),
      orderBy('createdAt', 'asc')
    );

    const messagesDocs = await getDocs(messagesQuery);
    const messages = messagesDocs.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Message[];

    if (messages.length === 0) {
      // Return an empty summary instead of throwing an error
      const emptySummary: ChatSummary = {
        id: 'generated',
        channelId,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        summary: 'No messages found in this time period.',
        topics: [],
        participants: [],
        keyPoints: [],
        metadata: {
          messageCount: 0,
          generatedAt: Timestamp.now()
        }
      };
      return emptySummary;
    }

    console.log('Found messages:', messages.length);

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
      role: 'user' as const,
      content: msg.content
    }));

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: AI_MODELS.CHAT.GPT4o,
      messages: [
        {
          role: "system" as const,
          content: `You are Scenie, an AI assistant tasked with summarizing chat conversations.
          Analyze the following chat messages and provide:
          1. A concise summary
          2. Main topics discussed
          3. Key points
          4. Action items (if any)
          
          Format your response as JSON with the following structure:
          {
            "summary": "Brief overview of the conversation",
            "topics": ["topic1", "topic2"],
            "keyPoints": ["point1", "point2"],
            "actionItems": ["action1", "action2"] // Optional
          }`
        },
        ...formattedMessages
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Failed to generate summary');
    }

    const analysis = JSON.parse(response);
    console.log('Generated analysis:', analysis);

    // Get unique participant IDs
    const participantIds = [...new Set(messages.map(msg => msg.userId))];

    // Create summary document
    const summaryRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'summaries');
    const summary: Omit<ChatSummary, 'id'> = {
      channelId,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      summary: analysis.summary,
      topics: analysis.topics,
      participants: participantIds,
      keyPoints: analysis.keyPoints,
      actionItems: analysis.actionItems,
      metadata: {
        messageCount: messages.length,
        generatedAt: Timestamp.now()
      }
    };

    const summaryDoc = await addDoc(summaryRef, summary);
    return {
      id: summaryDoc.id,
      ...summary
    };
  },

  async generateVoiceDictation(
    spaceId: string,
    channelId: string,
    messages: MessageFrontend[]
  ): Promise<VoiceDictation> {
    console.log('Generating voice dictation:', { spaceId, channelId, messageCount: messages.length });

    // Get all unique user IDs from messages
    const userIds = [...new Set(messages.map(msg => msg.userId))];
    
    // Fetch user information
    const users = await usersService.getUsers(userIds);

    // Format messages for narration, using user's full name or username
    const narrativeContent = messages.map(msg => {
      const user = users[msg.userId];
      const displayName = user?.fullName || user?.username || 'Unknown User';
      return `${displayName}: ${msg.content}`;
    }).join('\n');

    try {
      // First, generate a more natural narrative version of the chat
      const narrativeCompletion = await openai.chat.completions.create({
        model: AI_MODELS.CHAT.GPT4o,
        messages: [
          {
            role: "system" as const,
            content: `Convert the following chat messages into a natural, flowing narrative suitable for text-to-speech.
            Make it engaging and easy to follow, using transitions and proper context.
            Use the speaker's names naturally in the narrative, avoiding repetitive "X said" patterns.
            Keep speaker transitions concise and conversational.
            IMPORTANT: Keep the narrative concise and under 4000 characters to fit within text-to-speech limits.`
          },
          {
            role: "user" as const,
            content: narrativeContent
          }
        ],
        temperature: 0.7
      });

      const narrative = narrativeCompletion.choices[0]?.message?.content;
      if (!narrative) {
        throw new Error('Failed to generate narrative');
      }

      // Check narrative length and truncate if necessary
      const truncatedNarrative = narrative.length > 4000 
        ? narrative.slice(0, 3997) + '...'
        : narrative;

      // Generate speech from the narrative
      const speechResponse = await openai.audio.speech.create({
        model: AI_MODELS.VOICE.TTS,
        voice: AI_MODELS.VOICES.ALLOY,
        input: truncatedNarrative
      });

      // Convert the audio to a blob
      const audioBlob = await speechResponse.blob();
      
      // TODO: Upload the blob to Firebase Storage and get URL
      // For now, we'll use a data URL
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create dictation document
      const dictationRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'dictations');
      const dictation: Omit<VoiceDictation, 'id'> = {
        channelId,
        content: truncatedNarrative,
        status: 'ready',
        audioUrl,
        metadata: {
          generatedAt: Timestamp.now(),
          wordCount: truncatedNarrative.split(' ').length
        }
      };

      const dictationDoc = await addDoc(dictationRef, dictation);
      return {
        id: dictationDoc.id,
        ...dictation
      };
    } catch (error) {
      console.error('Failed to generate voice dictation:', error);
      
      // Create error record
      const dictationRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'dictations');
      const dictation: Omit<VoiceDictation, 'id'> = {
        channelId,
        content: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          generatedAt: Timestamp.now()
        }
      };

      const dictationDoc = await addDoc(dictationRef, dictation);
      return {
        id: dictationDoc.id,
        ...dictation
      };
    }
  },

  async generateSpaceVoiceDictation(
    spaceId: string
  ): Promise<VoiceDictation> {
    // Get messages from search service with empty query to get all messages
    const searchResults = await searchService.search(spaceId, '');
    const messages = searchResults
      .filter(result => result.type === 'message' && result.message)
      .map(result => {
        const message = result.message!;
        return {
          ...message,
          createdAt: message.createdAt.toDate(),
          updatedAt: message.updatedAt.toDate(),
          metadata: {
            ...message.metadata,
            threadInfo: message.metadata.threadInfo ? {
              ...message.metadata.threadInfo,
              lastReplyAt: message.metadata.threadInfo.lastReplyAt?.toDate() || null
            } : undefined
          }
        };
      });
    
    return this.generateVoiceDictation(spaceId, 'all', messages);
  },

  async getLatestSummary(spaceId: string, channelId: string): Promise<ChatSummary | null> {
    const summariesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'summaries');
    const summariesQuery = query(
      summariesRef,
      orderBy('metadata.generatedAt', 'desc'),
      limit(1)
    );

    const summaryDocs = await getDocs(summariesQuery);
    if (summaryDocs.empty) {
      return null;
    }

    const summaryDoc = summaryDocs.docs[0];
    return {
      id: summaryDoc.id,
      ...summaryDoc.data()
    } as ChatSummary;
  },

  // Get or create a Scenie conversation for a space member
  async getOrCreateConversation(spaceId: string, userId: string): Promise<ScenieConversation> {
    const conversationRef = doc(db, 'spaces', spaceId, 'members', userId, 'scenieChatMessages', 'conversation');
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      // Create new conversation
      const newConversation: ScenieConversation = {
        id: conversationRef.id,
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        activeMode: 'text'
      };

      await setDoc(conversationRef, {
        ...newConversation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return newConversation;
    }

    return {
      ...conversationDoc.data(),
      id: conversationDoc.id,
      createdAt: conversationDoc.data()?.createdAt?.toDate(),
      updatedAt: conversationDoc.data()?.updatedAt?.toDate()
    } as ScenieConversation;
  },

  // Add a message to the conversation
  async addMessage(spaceId: string, userId: string, message: Omit<ScenieMessage, 'id' | 'timestamp'>): Promise<ScenieMessage> {
    const conversationRef = doc(db, 'spaces', spaceId, 'members', userId, 'scenieChatMessages', 'conversation');
    const messagesRef = collection(conversationRef, 'messages');

    // Add the message
    const messageDoc = await addDoc(messagesRef, {
      ...message,
      timestamp: serverTimestamp()
    });

    // Update conversation's updatedAt
    await setDoc(conversationRef, {
      updatedAt: serverTimestamp()
    }, { merge: true });

    return {
      ...message,
      id: messageDoc.id,
      timestamp: new Date()
    };
  },

  // Get messages for a conversation with pagination
  async getMessages(spaceId: string, userId: string, messageLimit: number = 50, beforeTimestamp?: Date): Promise<ScenieMessage[]> {
    const messagesRef = collection(
      db, 
      'spaces', 
      spaceId, 
      'members', 
      userId, 
      'scenieChatMessages', 
      'conversation',
      'messages'
    );

    const constraints: QueryConstraint[] = [
      orderBy('timestamp', 'asc'),
      limit(messageLimit)
    ];

    if (beforeTimestamp) {
      constraints.unshift(where('timestamp', '>', beforeTimestamp));
    }

    const messagesQuery = query(messagesRef, ...constraints);
    const messagesDocs = await getDocs(messagesQuery);
    return messagesDocs.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as ScenieMessage[];
  },

  // Subscribe to new messages
  subscribeToMessages(spaceId: string, userId: string, callback: (messages: ScenieMessage[]) => void): () => void {
    const messagesRef = collection(
      db, 
      'spaces', 
      spaceId, 
      'members', 
      userId, 
      'scenieChatMessages', 
      'conversation',
      'messages'
    );

    const messagesQuery = query(
      messagesRef,
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ScenieMessage[];

      callback(messages);
    });
  }
}; 