import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { messageGeneratorService } from './message-generator';

interface ParticipantRole {
  userId: string;
  role: {
    description: string;
    traits: string;
  };
}

interface ConversationContext {
  topic: string;
  tone: 'casual' | 'formal' | 'technical';
  duration: 'short' | 'medium' | 'long';
  scenario: string;
}

interface MessageSeedRequest {
  spaceId: string;
  channelId: string;
  participants: ParticipantRole[];
  context: ConversationContext;
}

class MessageSeederService {
  private prepareParticipantsForGenerator(participants: ParticipantRole[]) {
    return participants.map(p => ({
      userId: p.userId,
      role: {
        description: p.role.description,
        traits: p.role.traits.split(',').map(t => t.trim()).filter(t => t)
      }
    }));
  }

  async seedMessages(request: MessageSeedRequest) {
    const { spaceId, channelId, participants, context } = request;
    
    // Generate messages using the generator service
    const generatedMessages = await messageGeneratorService.generateMessages({
      participants: this.prepareParticipantsForGenerator(participants),
      context
    });
    
    // Use batched writes for better performance
    const batch = writeBatch(db);
    const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');

    generatedMessages.forEach(message => {
      const docRef = doc(messagesRef);
      batch.set(docRef, {
        content: message.content,
        userId: message.userId,
        channelId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: 'TEXT',
        metadata: {
          reactions: {},
          edited: false
        }
      });
    });

    await batch.commit();
    return generatedMessages.length;
  }
}

export const messageSeederService = new MessageSeederService(); 