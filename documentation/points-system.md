# Scenius Points System

## Overview

The Scenius Points System is a community-driven reward mechanism that enables spaces to recognize and incentivize valuable contributions. Points serve as a measure of community engagement and determine each member's share of the community's monthly streaming token rewards.

## Core Concepts

### Points
- Numerical representation of community contribution value
- Non-transferable
- Can be awarded by administrators and designated roles
- Members can propose point awards for their contributions
- Points determine share of monthly reward budget

### Roles & Permissions

#### Administrators
- Can award points directly
- Can approve/deny point proposals
- Can designate point-granting roles
- Can configure monthly reward budgets

#### Point Granters
- Members with special roles designated by administrators
- Can award points directly
- Can approve/deny point proposals

#### Regular Members
- Can propose points for their contributions
- Can view their point balance
- Can view their current reward share
- Receive proportional streaming rewards based on points

## Point Allocation

### Direct Awards
```typescript
interface PointAward {
  id: string;
  recipientId: string;
  amount: number;
  reason: string;
  evidence?: string; // URL or reference
  granterId: string;
  createdAt: FirebaseTimestamp;
  spaceId: string;
}

// Frontend version
interface PointAwardFrontend extends Omit<PointAward, 'createdAt'> {
  createdAt: Date;
}
```

### Point Proposals
```typescript
interface PointProposal {
  id: string;
  memberId: string;
  spaceId: string;
  requestedAmount: number;
  reason: string;
  evidence?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewerId?: string;
  reviewNote?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// Frontend version
interface PointProposalFrontend extends Omit<PointProposal, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

### Voice-First Contribution Flow
```typescript
interface ContributionSize {
  type: 'S' | 'M' | 'L' | 'XL';
  basePoints: number;
}

interface ContributionCategory {
  type: 'TECHNICAL' | 'COMMUNITY' | 'CONTENT' | 'RESEARCH' | 'OTHER';
  label: string;
  description: string;
}

interface Contribution {
  id: string;
  spaceId: string;
  memberId: string;
  voiceDescription: string;
  transcription: string;
  size: ContributionSize;
  category: ContributionCategory;
  inferredCategory?: ContributionCategory;
  createdAt: FirebaseTimestamp;
}

// Frontend version
interface ContributionFrontend extends Omit<Contribution, 'createdAt'> {
  createdAt: Date;
}
```

The contribution flow:
1. User initiates with voice command ("Hey Scenie, log a contribution")
2. User describes their contribution verbally
3. AI transcribes and analyzes the description
4. User selects size (S/M/L/XL)
5. AI suggests contribution category
6. User confirms or adjusts category
7. Points are awarded based on size

### Point Decay (Optional)
```typescript
interface DecayConfig {
  enabled: boolean;
  halfLifeMonths: number;  // Default: 6
  minimumWeight: number;   // Minimum weight after decay (e.g., 0.1)
}

// Decay formula
function calculateWeight(originalPoints: number, monthsSinceAward: number, config: DecayConfig): number {
  if (!config.enabled) return originalPoints;
  
  const decayFactor = Math.pow(0.5, monthsSinceAward / config.halfLifeMonths);
  const weight = originalPoints * decayFactor;
  
  return Math.max(weight, originalPoints * config.minimumWeight);
}
```

## Superfluid Integration

### Token Streaming
```typescript
interface StreamConfig {
  superToken: string;        // Superfluid token address
  monthlyBudget: string;     // Total monthly budget in wei
  minPoints: number;         // Minimum points required to receive any share
}
```

### Flow Rate Calculation
```typescript
interface StreamStats {
  totalPoints: number;           // Sum of all qualifying member points
  memberPoints: number;          // Individual member's points
  monthlyBudget: string;        // Total monthly budget in wei
  memberShare: string;          // Member's share of the budget
  currentFlowRate: string;      // Member's current flow rate in wei/second
}

// Example calculation:
// memberShare = (memberPoints / totalPoints) * monthlyBudget
// currentFlowRate = memberShare / (30 * 24 * 60 * 60) // Convert to per-second rate
```

## Implementation Details

### Point-to-Stream Conversion
1. Space sets a monthly reward budget
2. Budget is automatically divided among qualifying members (≥ minPoints)
3. Each member's share is proportional to their points
4. Flow rates adjust automatically as points change

Example:
```typescript
// Monthly Budget: 1000 USDC
// Total Points: 1000
// Member Points: 100
// Member Share = (100/1000) * 1000 = 100 USDC/month
```

## Firestore Collections

### points
Collection for tracking user point balances and history
```typescript
interface Points {
  id: string;               // userId_spaceId
  userId: string;           // Reference to users collection
  spaceId: string;         // Reference to spaces collection
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
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// Frontend version
interface PointsFrontend extends Omit<Points, 'history' | 'streaming' | 'createdAt' | 'updatedAt'> {
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
  createdAt: Date;
  updatedAt: Date;
}
```

### pointProposals
Collection for tracking point award proposals
```typescript
interface PointProposal {
  id: string;
  spaceId: string;
  memberId: string;
  requestedAmount: number;
  reason: string;
  evidence?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewerId?: string;
  reviewNote?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// Frontend version
interface PointProposalFrontend extends Omit<PointProposal, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

### streamConfigs
Collection for space-level streaming configuration
```typescript
interface StreamConfig {
  id: string;              // spaceId
  spaceId: string;
  superToken: string;      // Superfluid token address
  monthlyBudget: string;   // Total monthly budget in wei
  minPoints: number;       // Minimum points required
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// Frontend version
interface StreamConfigFrontend extends Omit<StreamConfig, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

### contributionSizes
Collection for space-level contribution size configuration
```typescript
interface ContributionSize {
  id: string;             // spaceId_type
  spaceId: string;
  type: 'S' | 'M' | 'L' | 'XL';
  basePoints: number;
  createdAt: FirebaseTimestamp;
}

// Frontend version
interface ContributionSizeFrontend extends Omit<ContributionSize, 'createdAt'> {
  createdAt: Date;
}
```

### decayConfigs
Collection for space-level point decay configuration
```typescript
interface DecayConfig {
  id: string;             // spaceId
  spaceId: string;
  enabled: boolean;
  halfLifeMonths: number;
  minimumWeight: number;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

// Frontend version
interface DecayConfigFrontend extends Omit<DecayConfig, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
```

## Firestore Indexes
Required indexes for optimal query performance:

1. points
   - [spaceId, balance DESC]
   - [userId, spaceId]

2. pointProposals
   - [spaceId, status, createdAt DESC]
   - [memberId, status, createdAt DESC]

3. streamConfigs
   - [spaceId, updatedAt DESC]

## Security Rules
Key security considerations:

1. Points
   - Read: Space members can read point balances
   - Write: Only admins and point granters can award points
   - Decay: Automated function with admin privileges

2. Point Proposals
   - Read: Space members can read proposals
   - Write: Any member can create proposals
   - Update: Only admins and point granters can approve/deny

3. Stream Configs
   - Read: Space members can read configs
   - Write: Only space admins can modify

4. Contribution Sizes
   - Read: Space members can read sizes
   - Write: Only space admins can modify

5. Decay Configs
   - Read: Space members can read config
   - Write: Only space admins can modify

## User Interface

### Point Management
- Dashboard showing personal point balance
- History of point awards and proposals
- Form for submitting point proposals
- Interface for admins to review proposals
- Visualization of current reward share

### Stream Management
- Current streaming rate display
- Historical stream data
- Share of monthly budget calculator
- Budget configuration interface for admins
- Real-time treasury balance tracking

## Future Considerations

### Point Decay
- Implement point decay over time
- Configure decay rates per space
- Different decay rates for different contribution types

### Advanced Streaming
- Multiple budget pools for different contribution types
- Dynamic budget adjustments based on treasury
- Integration with other DeFi protocols

### Governance
- Point-weighted voting
- Automatic role assignment based on points
- Community-driven point system parameters

### Analytics
- Contribution metrics and trends
- Stream flow analysis
- Community engagement insights
- Treasury management tools 