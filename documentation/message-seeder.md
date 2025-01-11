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
      description: string; // Role description with context like "You are [name] in [space] in [channel]"
      traits?: string[]; // Personality traits for this role
    };
  }[];
  context: {
    scenario: string; // Detailed scenario description
    duration: 'short' | 'medium' | 'long'; // affects message count (5-10, 10-20, or 20-30 messages)
  };
}
```

### Wizard Interface
The message seeder uses a step-by-step wizard interface:

1. **Space & Channel Selection**
   - Select target space
   - Select target channel

2. **Participant Configuration**
   - Add/remove participants
   - Select users
   - Configure roles with auto-populated context
   - Define personality traits
   - Load from presets

3. **Context Configuration**
   - Define scenario
   - Set conversation duration

4. **Review & Generate**
   - Review all settings
   - Generate messages

### Example Usage
```typescript
const conversationSeed = {
  spaceId: 'engineering-team',
  channelId: 'project-apollo',
  participants: [
    { 
      userId: 'alice',
      conversationRole: {
        description: 'You are Alice Chen in the Engineering Team space in the project-apollo channel of a slack-like workspace. You are a new team member asking lots of questions about the codebase structure',
        traits: 'curious, detail-oriented'
      }
    },
    { 
      userId: 'bob',
      conversationRole: {
        description: 'You are Bob Smith in the Engineering Team space in the project-apollo channel of a slack-like workspace. You are a senior engineer helping onboard Alice by walking through the architecture',
        traits: 'patient, thorough'
      }
    }
  ],
  context: {
    scenario: 'A new team member is being onboarded and asking questions about the codebase structure. A senior engineer is explaining the architecture.',
    duration: 'long'
  }
}
```

## Presets
The system includes several conversation presets:
- Scientific Breakthrough
- Paranoid Monologue
- Historical Figures Chat
- Tech Discussion
- Customer Support

Each preset includes predefined roles and context that can be customized. 