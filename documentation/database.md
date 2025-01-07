# Scenius Database Schema

## Overview
Scenius uses Firebase/Firestore as its primary database, with real-time capabilities for messaging and presence. The schema is designed to support token-gating, role-based access control, and AI-driven features.

## Collections

### Users
```typescript
interface User {
  id: string;                   // Firebase Auth UID
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'away';
  lastSeen: FirebaseTimestamp;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  preferences: {
    notifications: boolean;
    theme: 'dark' | 'light';
    language: string;
  };
  walletAddresses?: string[];   // Connected Web3 wallets
}

// Frontend version
interface UserFrontend extends Omit<User, 'lastSeen' | 'createdAt' | 'updatedAt'> {
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Spaces
```typescript
interface Space {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  ownerId: string;              // Reference to User.id
  accessControl: AccessControl;
  settings: {
    isPublic: boolean;
    allowGuests: boolean;
    defaultRoleId: string;
  };
  metadata: {
    memberCount: number;
    channelCount: number;
  };
}

// Frontend version
interface SpaceFrontend extends Omit<Space, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

### Channels
```typescript
interface Channel {
  id: string;
  spaceId: string;             // Reference to Space.id
  name: string;
  description: string;
  type: 'TEXT' | 'VOICE' | 'FORUM';
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  metadata: {
    messageCount: number;
    lastMessageAt: FirebaseTimestamp | null;
  };
  permissions: {
    roleId: string;
    actions: string[];         // ['READ', 'WRITE', 'MANAGE', etc.]
  }[];
}

// Frontend version
interface ChannelFrontend extends Omit<Channel, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    messageCount: number;
    lastMessageAt: Date | null;
  };
}
```

### Messages
```typescript
interface Message {
  id: string;
  channelId: string;          // Reference to Channel.id
  spaceId: string;            // Reference to Space.id
  authorId: string;           // Reference to User.id
  content: string;
  type: 'TEXT' | 'VOICE' | 'FILE';
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  metadata: {
    voiceUrl?: string;
    transcription?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
  reactions: {
    [emoji: string]: string[]; // Array of User.ids who reacted
  };
  threadId?: string;          // Reference to parent Message.id if in thread
  threadMetadata?: {
    replyCount: number;
    lastReplyAt: FirebaseTimestamp;
  };
}

// Frontend version
interface MessageFrontend extends Omit<Message, 'createdAt' | 'updatedAt' | 'threadMetadata'> {
  createdAt: Date;
  updatedAt: Date;
  threadMetadata?: {
    replyCount: number;
    lastReplyAt: Date;
  };
}
```

### Roles
```typescript
interface Role {
  id: string;
  spaceId: string;           // Reference to Space.id
  name: string;
  color: string;
  position: number;          // For role hierarchy
  permissions: string[];     // ['MANAGE_CHANNELS', 'MANAGE_ROLES', etc.]
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  requirements?: GuildRequirement[];
}

// Frontend version
interface RoleFrontend extends Omit<Role, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

### Members
```typescript
interface Member {
  userId: string;            // Reference to User.id
  spaceId: string;          // Reference to Space.id
  roles: string[];          // Array of Role.ids
  joinedAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  nickname?: string;
  metadata: {
    lastActivity: FirebaseTimestamp;
    messageCount: number;
    reactionCount: number;
  };
}

// Frontend version
interface MemberFrontend extends Omit<Member, 'joinedAt' | 'updatedAt' | 'metadata'> {
  joinedAt: Date;
  updatedAt: Date;
  metadata: {
    lastActivity: Date;
    messageCount: number;
    reactionCount: number;
  };
}
```

### AI Twins
```typescript
interface Twin {
  id: string;
  userId: string;           // Reference to User.id
  name: string;
  avatarUrl: string | null;
  personality: {
    basePrompt: string;
    constraints: string[];
    style: string;
  };
  voiceConfig: {
    model: string;
    settings: Record<string, any>;
  };
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  metadata: {
    messageCount: number;
    lastActive: FirebaseTimestamp;
  };
}

// Frontend version
interface TwinFrontend extends Omit<Twin, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    messageCount: number;
    lastActive: Date;
  };
}
```

### Community Agents
```typescript
interface CommunityAgent {
  id: string;
  spaceId: string;          // Reference to Space.id
  name: string;
  framework: 'virtuals' | 'elizaos';
  tokenAddress?: string;    // If tokenized
  config: AgentConfig;      // From types above
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  metadata: {
    deployments: {
      platform: string;
      status: 'active' | 'paused' | 'error';
      lastSync: FirebaseTimestamp;
    }[];
  };
}

// Frontend version
interface CommunityAgentFrontend extends Omit<CommunityAgent, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    deployments: {
      platform: string;
      status: 'active' | 'paused' | 'error';
      lastSync: Date;
    }[];
  };
}
```

### Points
```typescript
interface Points {
  userId: string;           // Reference to User.id
  spaceId: string;         // Reference to Space.id
  balance: number;
  history: {
    id: string;
    amount: number;
    type: 'AWARD' | 'PROPOSAL' | 'DECAY';
    description: string;
    createdAt: FirebaseTimestamp;
  }[];
  streaming: {
    currentRate: string;    // Flow rate in wei/second
    totalStreamed: string;  // Total amount streamed in wei
    lastUpdate: FirebaseTimestamp;
  };
}

// Frontend version
interface PointsFrontend extends Omit<Points, 'history' | 'streaming'> {
  history: {
    id: string;
    amount: number;
    type: 'AWARD' | 'PROPOSAL' | 'DECAY';
    description: string;
    createdAt: Date;
  }[];
  streaming: {
    currentRate: string;
    totalStreamed: string;
    lastUpdate: Date;
  };
}
```

## Indexes
Required indexes for optimal query performance:

1. Messages
   - [channelId, createdAt DESC]
   - [channelId, threadId, createdAt DESC]
   - [spaceId, createdAt DESC]

2. Members
   - [spaceId, roles]
   - [userId, joinedAt DESC]

3. Channels
   - [spaceId, type]
   - [spaceId, metadata.lastMessageAt DESC]

4. Points
   - [spaceId, balance DESC]
   - [userId, spaceId, createdAt DESC]

## Security Rules
Key security considerations:

1. Users can only read/write their own user document
2. Space access is controlled by AccessControl rules
3. Channel access is controlled by Role permissions
4. Message operations require proper channel access
5. Role management requires MANAGE_ROLES permission
6. Points operations are restricted to space admins
7. Twin operations are restricted to twin owners
8. Agent operations are restricted to space admins 