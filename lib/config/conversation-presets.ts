export interface ConversationPreset {
  name: string;
  description: string;
  context: {
    topic: string;
    tone: 'casual' | 'formal' | 'technical';
    duration: 'short' | 'medium' | 'long';
    scenario: string;
  };
  participants: {
    role: string;
    traits: string;
  }[];
}

export const CONVERSATION_PRESETS: Record<string, ConversationPreset> = {
  'historical-chat': {
    name: 'Historical Figures Chat',
    description: 'A casual chat between historical figures in the Scenius Town Square',
    context: {
      topic: "how crazy it is that we're able to talk to each other even through the afterlife thanks to Scenius.chat",
      tone: 'casual',
      duration: 'long',
      scenario: 'Albert Einstein and Shakespeare join Gary for a chat in the Scenius Town Square Space on Scenius.Chat'
    },
    participants: [
      {
        role: "he's basically the host of the space, so be welcoming and in awe he gets to talk to some heroes",
        traits: 'welcoming, excited, curious'
      },
      {
        role: 'be a lovely inquisitive guy who is curious about the state of the world today',
        traits: 'curious, charming, genius'
      },
      {
        role: 'be a funny bard, you are shakespeare - self aware',
        traits: 'funny'
      }
    ]
  },
  'tech-discussion': {
    name: 'Tech Team Discussion',
    description: 'A technical discussion between team members about a new feature',
    context: {
      topic: 'Implementing the new authentication system',
      tone: 'technical',
      duration: 'medium',
      scenario: 'The development team discusses the implementation details of a new OAuth2 authentication system'
    },
    participants: [
      {
        role: 'Tech lead guiding the discussion and providing architectural insights',
        traits: 'experienced, methodical, detail-oriented'
      },
      {
        role: 'Security engineer raising concerns and best practices',
        traits: 'cautious, knowledgeable, thorough'
      },
      {
        role: 'Frontend developer asking about implementation details and UI/UX considerations',
        traits: 'curious, user-focused, practical'
      }
    ]
  },
  'customer-support': {
    name: 'Customer Support Interaction',
    description: 'A support conversation between an agent and a customer',
    context: {
      topic: 'Resolving account access issues',
      tone: 'formal',
      duration: 'short',
      scenario: 'A customer is having trouble logging into their account and a support agent helps them resolve the issue'
    },
    participants: [
      {
        role: 'Support agent helping resolve the issue professionally and efficiently',
        traits: 'helpful, patient, professional'
      },
      {
        role: 'Customer experiencing login issues and seeking help',
        traits: 'frustrated, cooperative, grateful'
      }
    ]
  }
}; 