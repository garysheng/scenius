# Message Seeder Framework

## Overview
A framework for seeding realistic conversations between users in Spaces and Channels. This allows for creating natural-looking message history and conversations for testing and demonstration purposes.

## Core Concepts

### Conversation Definition
```typescript
interface ConversationSeed {
  spaceId: string;
  channelId: string;
  participants: {
    userId: string;
    conversationRole: {
      description: string; // free-form description of their role in the conversation
      traits?: string[]; // optional personality traits for this role
    };
  }[];
  context: {
    topic: string;
    tone: 'casual' | 'formal' | 'technical';
    duration: 'short' | 'medium' | 'long'; // affects message count
    scenario?: string; // optional detailed scenario description
  };
}
```

### Example Usage
```typescript
const conversationSeed = {
  spaceId: 'engineering-team',
  channelId: 'project-apollo',
  participants: [
    { 
      userId: 'alice',
      conversationRole: {
        description: 'New team member asking lots of questions about the codebase structure',
        traits: ['curious', 'detail-oriented']
      }
    },
    { 
      userId: 'bob',
      conversationRole: {
        description: 'Senior engineer helping onboard Alice by walking through the architecture',
        traits: ['patient', 'thorough']
      }
    },
    { 
      userId: 'charlie',
      conversationRole: {
        description: 'Security-focused engineer jumping in occasionally with security considerations',
        traits: ['precise', 'security-minded']
      }
    }
  ],
  context: {
    topic: 'Onboarding discussion about the codebase architecture',
    tone: 'technical',
    duration: 'long',
    scenario: 'A new team member is being onboarded and asking questions about the codebase structure. A senior engineer is explaining the architecture while another engineer occasionally adds security-related context.'
  }
}
```

## Flow

1. **Space Selection**
   - Select target Space where messages will be seeded
   - Validate Space exists and seeder has access

2. **Channel Selection**
   - Select target Channel (including DM channels)
   - Validate Channel exists within Space
   - Verify channel type (public, private, DM)

3. **Participant Selection**
   - Select users who will participate
   - Must be existing members of the Space/Channel
   - Write natural descriptions of each participant's role in the conversation
   - Optionally add personality traits that influence their communication style

4. **Context Definition**
   - Define conversation topic
   - Set conversation tone
   - Determine approximate duration/length
   - Optionally add detailed scenario description
   - Define the narrative flow between participants

5. **Message Generation**
   - Generate messages based on context and role descriptions
   - Maintain consistent character for each participant
   - Respect defined traits and conversation tone
   - Create natural flow based on role descriptions
   - Maintain realistic timing between messages
   - Include relevant message types (text, voice, etc.)

## Next Steps

1. Create seeder service interface
2. Implement conversation generation logic
3. Add timing and message distribution algorithms
4. Create CLI or UI for easy seeding
5. Add validation and error handling 