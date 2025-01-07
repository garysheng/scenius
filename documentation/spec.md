# Scenius Product Requirements Document

## Implementation Progress

### Authentication & Identity
- [x] Email authentication
- [x] Google OAuth
- [ ] GitHub OAuth
- [ ] Discord OAuth
- [ ] Custom OAuth providers
- [ ] Two-factor authentication
- [ ] SSO integration

### Community Access
- [x] Basic space creation
- [x] Member management
- [x] Role-based access
- [ ] Email domain control
- [ ] Invite system
- [ ] Access analytics
- [ ] Custom access rules

### Real-time Messaging
- [x] Basic messaging
- [x] Message formatting
- [x] File attachments
- [x] Emoji reactions
- [ ] Message threading
- [ ] Rich media preview
- [ ] Message editing
- [ ] Message deletion

### Channel Management
- [x] Channel creation
- [x] Channel settings
- [x] Channel permissions
- [ ] Channel categories
- [ ] Channel archiving
- [ ] Channel analytics
- [ ] Custom channel types

### Search & Discovery
- [x] Basic search
- [x] Deep linking
- [ ] Advanced filters
- [ ] Search analytics
- [ ] Custom search rules
- [ ] Search suggestions
- [ ] Search history

### AI Integration
- [x] Chat summaries
- [x] Voice dictation
- [ ] Content analysis
- [ ] AI suggestions
- [ ] Custom AI models
- [ ] Integration API
- [ ] AI analytics

### Web3 Features
- [ ] Wallet connection
- [ ] Token gating
- [ ] NFT integration
- [ ] DAO tooling
- [ ] Token streaming
- [ ] Web3 analytics
- [ ] Custom contracts

### Analytics & Insights
- [ ] Member analytics
- [ ] Content analytics
- [ ] Engagement metrics
- [ ] Growth tracking
- [ ] Custom reports
- [ ] Export tools
- [ ] API access

## 1. Introduction

### 1.1 Purpose
This document outlines the requirements for Scenius (https://www.scenius.chat), an AI-native collaboration platform for innovation communities (AI, Web3, and emerging tech). It integrates AI agents, voice interaction, and flexible access controls to enhance community engagement.

### 1.2 Scope
Scenius provides real-time messaging, voice-enabled interactions, AI-driven digital twins (Twins), and a Space Assistant named Scenie. It supports multiple access controls (token-gating, domain/email whitelisting, and Guild.xyz integration) to accommodate various community needs.

### 1.3 Definitions
- A Twin is an AI representation of a user, reflecting their personal style
- Scenie is the Space Assistant with a consistent personality across contexts, offering voice summaries and other AI-driven features
- A Space is a community hub with channels, members, and access rules
- Guild.xyz manages token-gating and on-chain role assignments
- A Community Agent is a tokenized AI agent representing a community across social media, built on Virtuals Protocol or the elizaOS framework

## 2. Objectives

### 2.1 Primary Goals
- Use AI and voice features to boost collaboration
- Support token-gated spaces and role-based access
- Promote collective intelligence for innovation communities
- Provide tokenized AI agents for community representation

### 2.2 Secondary Goals
- Give users personalized AI interactions with Twins
- Support Web3 infrastructure and robust security/privacy
- Offer custom access rules and roles
- Enable cross-platform deployment of AI agents

## 3. Key Features

### 3.1 Authentication & Authorization
- Multiple sign-in options: Email/Password, Google OAuth, etc.
- Session management with Firebase Auth for secure token handling
- Automatic token refresh and cross-device session sync
- Email verification, password reset, profile management, and avatars

### 3.2 Community Access & Roles
- Access control via token-gating (Guild.xyz), domain whitelisting, or email whitelisting
- Automatic role assignment based on on-chain criteria or custom rules
- Flexible membership rules per Space (temporary roles, multiple auth methods)
- Fine-grained channel permissions and role hierarchies

### 3.3 Real-Time Messaging
- Text and voice messages with transcription
- Token-gated channels, direct messages, file sharing via Firebase Storage
- Real-time presence, threaded chats, and emoji reactions

### 3.4 Space Assistant (Scenie)
- Voice-enabled catch-up on missed messages
- Context-aware summaries and insights
- Voice recording with transcription
- Personalized to each community\'s knowledge base

### 3.5 AI Twins
- AI versions of users with context-aware responses
- Voice synthesis, optional message approval, and continuous learning
- Automated cues from user interaction history

### 3.6 Audio Conversation Replay
- Voice sample collection and synthesized playback
- Interactive pause and response
- Smooth navigation of voice-based conversations

### 3.7 Tokenized Community Agents
- Integration with Virtuals Protocol and elizaOS
- One-click deployment of token-based community agents
- Agent presence on social platforms (X, Farcaster, etc.)
- Automated engagement and on-chain governance
- Configurable personality, memory, and actions
- Revenue sharing for token holders

### 3.8 Community Points & Streaming Rewards
- Admin and user-driven point awards
- Evidence-based contributions and proposals
- Superfluid integration for token streaming
- Real-time flow rate adjustments, point history, and analytics
- Future expansions like point decay and governance tools

## 4. Technical Implementation

### 4.1 Authentication Implementation
```typescript
interface AuthConfig {
  providers: {
    email: boolean;
    google: boolean;
    github?: boolean;
    discord?: boolean;
  };
  redirects: {
    signIn: string;
    signUp: string;
    afterSignIn: string;
    afterSignUp: string;
  };
  session: {
    expiryTime: number; // in seconds
    refreshThreshold: number; // in seconds
  };
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
}
```

We rely on Firebase Auth for secure user authentication, session handling, and cross-device/session synchronization.

### 4.2 Guild.xyz Integration
```typescript
interface GuildRequirement {
  type: 'TOKEN' | 'NFT' | 'POAP' | 'CUSTOM';
  chain: string;
  address: string;
  amount?: string;
  tokenId?: string;
  customLogic?: string;
}

interface SpaceAccess {
  guildId: string;
  requirements: GuildRequirement[];
  roles: {
    name: string;
    requirements: GuildRequirement[];
  }[];
}
```

We integrate Guild.xyz via APIs and webhooks to manage token-based access rules and on-chain verifications.

### 4.3 Role Management
Role assignments update automatically through Guild.xyz webhooks. We store roles in Firestore for caching and quick lookups when users are offline. We periodically synchronize to make sure no role changes are missed.

### 4.4 Community Agent Implementation
```typescript
interface AgentConfig {
  framework: 'virtuals' | 'elizaos';
  tokenomics: {
    initialSupply: number;
    distribution: {
      community: number;
      treasury: number;
      development: number;
    };
    revenueSharing: {
      holders: number;
      platform: number;
    };
  };
  personality: {
    basePrompt: string;
    constraints: string[];
    allowedActions: string[];
  };
  platforms: {
    x?: {
      autoPost: boolean;
      replyStrategy: string;
    };
    farcaster?: {
      autoPost: boolean;
      replyStrategy: string;
    };
  };
}
```

We deploy community agents that operate across social platforms, governed by custom tokenomics and a shared on-chain framework.

### 4.5 Points & Streaming Integration
```typescript
interface PointSystem {
  points: {
    awards: PointAward[];
    proposals: PointProposal[];
    balance: number;
  };
  streaming: {
    config: StreamConfig;
    currentRate: string;
    totalStreamed: string;
  };
}

interface StreamConfig {
  superToken: string;        // Superfluid token address
  monthlyBudget: string;     // Total monthly budget in wei
  minPoints: number;         // Minimum points required to receive any share
}
```

Superfluid handles streaming tokens, while we track points and proposals in Firestore to show real-time user balances and contributions.

### 4.6 Access Control Implementation
```typescript
interface AccessControl {
  type: 'TOKEN_GATE' | 'DOMAIN' | 'EMAIL' | 'CUSTOM' | 'GUILD';
  config: {
    domains?: string[];
    emails?: string[];
    guildId?: string;
    customLogic?: string;
    requirements?: GuildRequirement[];
  };
  combineMethod: 'AND' | 'OR';
}

interface SpaceAccess {
  accessControls: AccessControl[];
  roles: {
    name: string;
    permissions: string[];
    requirements?: AccessControl[];
  }[];
}
```

Access rules can be combined with AND or OR logic, allowing multiple gates for each Space or channel. We store these configurations in Firestore.

## 5. Roadmap

### Phase 1: Core Platform
Focus on basic messaging, voice features, user authentication with Firebase Auth, and creating/managing Spaces.

### Phase 2: AI Features
Implement AI Twins, Space Assistant (Scenie), and voice synthesis. Use these to improve engagement and context-aware interactions.

### Phase 3: Web3 Integration
Enable Guild.xyz integration, token-gated Spaces, and on-chain role management. Support multiple wallet connections.

### Phase 4: Community Agents
Connect to Virtuals Protocol or elizaOS, let communities create tokenized AI agents, and integrate them into social media channels.

### Phase 5: Points & Streaming
Launch the points system, integrate Superfluid for streaming, and allow point-based proposals, awards, and governance features.

### Phase 6: Advanced Features
Add custom requirement builders, multi-chain support, advanced DAO tooling, cross-agent collaboration, point decay, and sophisticated streaming mechanics.

## 6. Success Metrics
Key performance indicators include:
- Community engagement
- Message volume
- Quality of AI interactions
- Adoption of token-gated Spaces
- Role management efficiency
- User satisfaction
- Number of agents deployed
- Social media traction
- Token holder participation
- Revenue per agent

## 7. Future Considerations
To further expand the platform, we may integrate additional blockchains and DAO frameworks, offer more advanced token-based incentives and analytics, enable inter-agent communication, and explore decentralized hosting or custom AI training pipelines.

## Implementation Progress

### Authentication & Authorization
- [x] Firebase Auth integration
- [x] Email/Password authentication
- [x] Google OAuth
- [x] Session management
- [ ] Cross-device session sync
- [x] Email verification
- [x] Password reset flow
- [x] Profile management
- [x] Avatar support

### Community Access & Roles
- [x] Basic role system
- [x] Channel permissions
- [ ] Guild.xyz integration
- [ ] Token-gating
- [ ] Domain whitelisting
- [ ] Email whitelisting
- [ ] Automatic role assignment
- [ ] Temporary roles
- [ ] Role hierarchies

### Real-Time Messaging
- [x] Text messages
- [x] Real-time updates
- [x] Channel creation
- [x] Direct messages
- [x] File sharing
- [x] Presence indicators
- [x] Message threads
- [x] Emoji reactions
- [ ] Voice messages
- [ ] Voice transcription

### Space Assistant (Scenie)
- [x] Basic chat summaries
- [x] Voice-to-text
- [ ] Context-aware summaries
- [ ] Voice synthesis
- [ ] Custom timeframe summaries
- [ ] Thread analysis
- [ ] Resource collection
- [ ] Sentiment analysis

### AI Twins
- [ ] Twin creation
- [ ] Context-aware responses
- [ ] Voice synthesis
- [ ] Message approval flow
- [ ] Learning system
- [ ] Interaction history
- [ ] Personality customization

### Audio Features
- [x] Voice recording
- [ ] Voice playback
- [ ] Interactive pause
- [ ] Voice navigation
- [ ] Multi-speaker support
- [ ] Voice commands
- [ ] Background noise reduction

### Community Agents
- [ ] Virtuals Protocol integration
- [ ] elizaOS integration
- [ ] Social platform deployment
- [ ] Token configuration
- [ ] Revenue sharing
- [ ] Governance integration
- [ ] Agent customization

### Points & Rewards
- [ ] Point system
- [ ] Contribution tracking
- [ ] Superfluid integration
- [ ] Token streaming
- [ ] Point proposals
- [ ] Analytics dashboard
- [ ] Governance tools 

### Voice Communication
- [ ] Voice message recording
- [ ] Voice message sharing
- [ ] Voice transcription
- [ ] Voice anonymization
- [ ] Voice filter presets
- [ ] Real-time preview
- [ ] Privacy-preserving processing
- [ ] Client-side modulation
- [ ] Multiple filter options
- [ ] Preset management
- [ ] No original audio storage
- [ ] Anti-reconstruction
- [ ] Voice fingerprint masking