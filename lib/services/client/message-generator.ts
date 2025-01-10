interface MessageGeneratorRequest {
  participants: {
    userId: string;
    role: {
      description: string;
      traits: string[];
    };
  }[];
  context: {
    topic: string;
    tone: 'casual' | 'formal' | 'technical';
    duration: 'short' | 'medium' | 'long';
    scenario: string;
  };
}

interface GeneratedMessage {
  content: string;
  userId: string;
  timestamp: Date;
}

const MESSAGES_PER_DURATION = {
  short: { min: 5, max: 10 },
  medium: { min: 15, max: 25 },
  long: { min: 30, max: 50 }
};

class MessageGeneratorService {
  private async generatePrompt(request: MessageGeneratorRequest): Promise<string> {
    const { participants, context } = request;
    
    const participantsDescription = participants
      .map(p => {
        const traits = p.role.traits.length > 0 
          ? `Their traits are: ${p.role.traits.join(', ')}`
          : '';
        return `User ${p.userId}: ${p.role.description}. ${traits}`;
      })
      .join('\n');

    return `Generate a realistic conversation between multiple participants.

Topic: ${context.topic}
Tone: ${context.tone}
Scenario: ${context.scenario}

Participants:
${participantsDescription}

The conversation should feel natural and reflect each participant's role and traits.
Each message should be in the format:
userId: message content

Generate a conversation with multiple back-and-forth exchanges that tells a coherent story.`;
  }

  async generateMessages(request: MessageGeneratorRequest): Promise<GeneratedMessage[]> {
    const { duration } = request.context;
    const { min, max } = MESSAGES_PER_DURATION[duration];
    const messageCount = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // TODO: Integrate with actual AI service
    // For now, return placeholder messages
    const messages: GeneratedMessage[] = [];
    const startTime = new Date(Date.now() - messageCount * 60000); // Messages spread over messageCount minutes

    for (let i = 0; i < messageCount; i++) {
      const participant = request.participants[i % request.participants.length];
      messages.push({
        content: `Test message ${i + 1} from participant with role: ${participant.role.description}`,
        userId: participant.userId,
        timestamp: new Date(startTime.getTime() + i * 60000)
      });
    }

    return messages;
  }
}

export const messageGeneratorService = new MessageGeneratorService(); 