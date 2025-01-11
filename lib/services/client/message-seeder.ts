import { ConversationContext } from '@/types/conversations';
import { messageGeneratorService } from './message-generator';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';

interface MessageSeederRequest {
  spaceId: string;
  channelId: string;
  participants: {
    userId: string;
    role: {
      description: string;
      traits: string;
    };
  }[];
  context: {
    scenario: string;
    duration: 'short' | 'medium' | 'long';
  };
}

class MessageSeederService {
  async seedMessages(request: MessageSeederRequest): Promise<number> {
    console.log('Starting message seeding with request:', request);

    try {
      // Generate messages using the message generator service
      const generatedMessages = await messageGeneratorService.generateMessages({
        participants: request.participants.map((p, index) => ({
          id: String(index + 1),
          ...p
        })),
        context: request.context
      });

      console.log('Generated messages:', generatedMessages);

      // Create a batch write
      const batch = writeBatch(db);
      const messagesRef = collection(db, 'spaces', request.spaceId, 'channels', request.channelId, 'messages');

      // Add each message to the batch
      generatedMessages.forEach(message => {
        const messageDoc = doc(messagesRef);
        batch.set(messageDoc, {
          channelId: request.channelId,
          content: message.content,
          createdAt: Timestamp.fromDate(message.timestamp),
          metadata: {
            attachments: [],
            edited: false,
            reactions: {},
            status: 'sent'
          },
          type: 'TEXT',
          updatedAt: Timestamp.fromDate(message.timestamp),
          userId: message.userId,
          threadId: null
        });
      });

      // Commit the batch
      await batch.commit();
      console.log(`Successfully seeded ${generatedMessages.length} messages`);

      return generatedMessages.length;
    } catch (error) {
      console.error('Error seeding messages:', error);
      throw error;
    }
  }
}

export const messageSeederService = new MessageSeederService(); 