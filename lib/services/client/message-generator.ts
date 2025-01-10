import { ConversationContext } from '@/types/conversations';
import { MessageSeederUser } from '@/types/users';

interface Participant {
  id: string;
  userId: string;
  user?: MessageSeederUser;
  role: {
    description: string;
    traits: string;
  };
}

interface MessageGeneratorRequest {
  participants: Participant[];
  context: ConversationContext;
}

interface GeneratedMessage {
  userId: string;
  content: string;
  timestamp: Date;
}

class MessageGeneratorService {
  private generatePrompt(request: MessageGeneratorRequest): string {
    const { participants, context } = request;
    
    // Create a detailed system prompt
    const systemPrompt = `You are tasked with generating a natural ${context.duration} conversation between ${participants.length} participants.
The conversation should be ${context.tone} in tone and focus on the topic: "${context.topic}"

Scenario: ${context.scenario}

Participants and their roles:
${participants.map((p, i) => `Participant ${i + 1}: ${p.role.description}
Traits: ${p.role.traits}`).join('\n\n')}

Important guidelines:
1. Generate messages that feel natural and flow well
2. Stay true to each participant's defined role and traits
3. Keep the conversation focused on the topic while allowing for natural tangents
4. Maintain consistent personality and voice for each participant
5. Include natural conversation elements like questions, reactions, and references to previous messages
6. Format each message as: [participant1]|||[message content] for the first participant, [participant2]|||[message content] for the second, etc.

The conversation should have a clear beginning, middle, and end structure.`;

    return systemPrompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate conversation');
      }

      const data = await response.json();
      return data.conversation;
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw error;
    }
  }

  private parseGeneratedMessages(rawConversation: string, participants: Participant[]): GeneratedMessage[] {
    console.log('Parsing raw conversation:', rawConversation);
    
    const lines = rawConversation.split('\n').filter(line => line.trim());
    const messages: GeneratedMessage[] = [];
    
    // Start from 120 minutes ago
    const startTime = new Date(Date.now() - 120 * 60000);
    let currentTime = startTime;

    // Create a mapping of participant numbers to userIds
    const participantMap = new Map<string, string>();
    participants.forEach((p, index) => {
      participantMap.set(`participant${index + 1}`, p.userId);
    });

    console.log('Participant mapping:', Object.fromEntries(participantMap));

    for (const line of lines) {
      const [participantKey, content] = line.split('|||').map(part => part.trim());
      if (participantKey && content) {
        // Get the actual userId from our mapping
        const userId = participantMap.get(participantKey);
        console.log('Processing line:', { participantKey, userId, content });
        
        if (userId) {
          messages.push({
            userId,
            content,
            timestamp: new Date(currentTime)
          });
          // Add between 1-3 minutes between messages
          currentTime = new Date(currentTime.getTime() + 60000 + Math.random() * 120000);
        }
      }
    }

    console.log('Parsed messages:', messages);
    return messages;
  }

  async generateMessages(request: MessageGeneratorRequest): Promise<GeneratedMessage[]> {
    console.log('Generating messages with request:', request);

    // Generate the conversation prompt
    const prompt = this.generatePrompt(request);
    console.log('Generated prompt:', prompt);

    // Call the LLM to generate the conversation
    const rawConversation = await this.callLLM(prompt);
    console.log('Raw conversation from LLM:', rawConversation);

    // Parse and format the generated messages
    const messages = this.parseGeneratedMessages(rawConversation, request.participants);
    console.log('Final messages:', messages);

    return messages;
  }
}

export const messageGeneratorService = new MessageGeneratorService(); 