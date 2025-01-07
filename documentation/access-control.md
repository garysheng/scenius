# Access Control System

## Overview
Scenius supports flexible access control mechanisms for spaces, allowing communities to manage their membership through composable access methods. Each method can be enabled independently and combined with custom rules.

## Implementation Progress

### Core Access Methods
- [x] Basic member roles
- [x] Role permissions
- [ ] Email list control
- [ ] Domain verification
- [ ] Invite link system
- [ ] Custom access rules
- [ ] Role assignment rules
- [ ] Auto-cleanup rules

### Email List Features
- [ ] Bulk email upload
- [ ] Email pattern matching
- [ ] Auto role assignment
- [ ] Expiry dates
- [ ] Domain override rules
- [ ] Email validation
- [ ] Notification system

### Domain Control Features
- [ ] Domain verification flow
- [ ] Subdomain support
- [ ] Auto role assignment
- [ ] Path restrictions
- [ ] Email override support
- [ ] Verification tracking
- [ ] Domain analytics

### Invite System
- [x] Basic invite generation
- [ ] Time-limited invites
- [ ] Usage-limited invites
- [ ] Role assignment
- [ ] Invite tracking
- [ ] Revocation system
- [ ] Invite analytics

### Role Management
- [x] Basic roles (Owner, Admin, Member)
- [x] Permission system
- [ ] Custom roles
- [ ] Role hierarchies
- [ ] Permission inheritance
- [ ] Role analytics
- [ ] Audit logging

### Security Features
- [x] Basic permission checks
- [ ] Advanced rule validation
- [ ] Rate limiting
- [ ] Abuse prevention
- [ ] Security logging
- [ ] Access monitoring
- [ ] Automated cleanup

## Core Access Methods

### 1. Email List Control
```typescript
interface EmailListAccess {
  enabled: boolean;
  emails: string[];
  autoRole?: string;
  allowDomainOverride: boolean;  // if true, domain access can override restrictions
  expiryDate?: Date;            // optional expiry for entire list
  emailPatterns?: string[];     // support for wildcards, e.g., "engineering-*@company.com"
}
```

### 2. Domain Control
```typescript
interface DomainAccess {
  enabled: boolean;
  domains: {
    domain: string;
    verified: boolean;
    autoRole?: string;
    restrictedPaths?: string[]; // specific email paths to allow/deny
    allowSubdomains: boolean;
  }[];
  requireVerification: boolean;
  allowEmailOverride: boolean;  // if true, email list can override restrictions
}
```

### 3. Invite Links
```typescript
interface InviteLink {
  id: string;
  spaceId: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  maxUses: number | null;
  useCount: number;
  isRevoked: boolean;
  assignedRole: string;
  code: string; // unique invite code
}

interface InviteAccess {
  enabled: boolean;
  types: {
    oneTime: boolean;
    limited: boolean;
    timed: boolean;
    permanent: boolean;
  };
  restrictions: {
    maxUses?: number;
    maxDuration?: number;
    allowedRoles: string[];
    requireEmailMatch?: boolean;  // must match email list or domain
    requireApproval?: boolean;
  };
}
```

## Composable Configuration
```typescript
interface SpaceAccess {
  id: string;
  spaceId: string;
  name: string;           // e.g., "Q4 2025 Access Rules"
  description: string;
  
  // Core Access Methods
  emailList: EmailListAccess;
  domains: DomainAccess;
  invites: InviteAccess;
  
  // Composition Rules
  rules: {
    combineMethod: 'ANY' | 'ALL' | 'CUSTOM';
    customLogic?: string;  // e.g., "(EMAIL_LIST OR DOMAIN) AND INVITE"
    priority: {
      order: ('EMAIL_LIST' | 'DOMAIN' | 'INVITE')[];
      conflictResolution: 'MOST_PERMISSIVE' | 'LEAST_PERMISSIVE' | 'PRIORITY_ORDER';
    };
  };
  
  // Role Assignment Logic
  roleAssignment: {
    defaultRole: string;
    rules: {
      condition: {
        accessMethod: 'EMAIL_LIST' | 'DOMAIN' | 'INVITE';
        criteria?: any;
      };
      role: string;
      priority: number;
    }[];
  };
  
  // Expiry & Cleanup
  cleanup: {
    enableAutoCleanup: boolean;
    rules: {
      accessMethod: 'EMAIL_LIST' | 'DOMAIN' | 'INVITE';
      action: 'REMOVE' | 'RESTRICT' | 'NOTIFY';
      timing: {
        type: 'AFTER_DURATION' | 'AT_DATE' | 'AFTER_INACTIVITY';
        value: number | Date;
      };
    }[];
  };
}
```

## Role System

### Default Roles
- Owner (space creator)
- Admin (full management rights)
- Moderator (channel management, user moderation)
- Member (basic access)
- Guest (limited access)

### Role Configuration
```typescript
interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  position: number; // for hierarchy
  isCustom: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Permission {
  type: PermissionType;
  allow: boolean;
  conditions?: {
    channels?: string[];
    roles?: string[];
  };
}

type PermissionType =
  | 'MANAGE_CHANNELS'
  | 'MANAGE_ROLES'
  | 'MANAGE_INVITES'
  | 'MANAGE_MESSAGES'
  | 'SEND_MESSAGES'
  | 'VIEW_CHANNELS'
  | 'MANAGE_MEMBERS'
  | 'VOICE_CONNECT'
  | 'VOICE_SPEAK';
```

## Example Scenarios

### 1. Enterprise + External Contractors
#### Setup
- Space: "TechCorp Project Hub"
- Primary Access: Domain whitelist for @techcorp.com
- Secondary Access: Invite links for contractors

#### Flow
1. All @techcorp.com employees can join automatically
2. Project managers can generate time-limited invite links for contractors
   - Links expire after 90 days
   - Automatically assign "Contractor" role
   - Limited to specific channels
3. When contractor's email domain doesn't match @techcorp.com:
   - System flags them as external
   - Adds "External" badge to their profile
   - Restricts access to internal-only channels
4. Automatic cleanup:
   - System notifies PMs of expiring contractor access
   - Option to extend or revoke access
   - Audit log of all external access

### 2. Educational Institution + Guest Speakers
#### Setup
- Space: "University CS Department"
- Primary Access: Domain whitelist for @university.edu
- Secondary Access: Guest speaker invites

#### Flow
1. Students and faculty with @university.edu join automatically
   - Students get "Student" role
   - Faculty get "Faculty" role based on email prefix
2. Department admin generates special invite links for guest speakers
   - One-time use links
   - Valid for the semester
   - Include speaker's bio and schedule
3. Guest speakers can:
   - Access their dedicated channel
   - View student projects they're mentoring
   - Cannot access faculty-only channels
4. After semester ends:
   - System archives guest speaker channels
   - Converts access to read-only
   - Option to extend for next semester

### 3. Startup Community + Investors
#### Setup
- Space: "Startup Accelerator Hub"
- Primary Access: Verified startup domain list
- Secondary Access: Investor invite system

#### Flow
1. Startups join via domain verification
   - Must prove company ownership
   - Get "Startup" role with basic access
2. Special investor invitation process:
   - Generate unique investor profile links
   - Requires email from verified VC domains
   - Custom onboarding flow for investors
3. Hybrid access rules:
   - Startups see only their own channels + common areas
   - Investors see all startup channels they're invited to
   - Admins can create deal-specific private channels

## Implementation Details

### API Endpoints
```typescript
// Space Access Management
createInviteLink(spaceId: string, options: InviteLinkOptions): Promise<InviteLink>
revokeInviteLink(spaceId: string, inviteId: string): Promise<void>
addDomainAccess(spaceId: string, domain: string): Promise<void>
removeDomainAccess(spaceId: string, domain: string): Promise<void>
verifyDomain(spaceId: string, domain: string, proof: string): Promise<void>

// Role Management
createRole(spaceId: string, roleData: Partial<Role>): Promise<Role>
updateRole(spaceId: string, roleId: string, updates: Partial<Role>): Promise<void>
deleteRole(spaceId: string, roleId: string): Promise<void>
assignRole(spaceId: string, userId: string, roleId: string): Promise<void>
removeRole(spaceId: string, userId: string, roleId: string): Promise<void>

// Permission Management
updatePermissions(spaceId: string, roleId: string, permissions: Permission[]): Promise<void>
checkPermission(spaceId: string, userId: string, permission: PermissionType, context?: any): Promise<boolean>
```

### Security Rules
```typescript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /spaces/{spaceId} {
      function hasAnyAccess(access) {
        return access.emailList.enabled && (
          access.emailList.emails.hasAny([request.auth.token.email])
        ) || (
          access.domains.enabled &&
          access.domains.domains.hasAny([request.auth.token.email.split('@')[1]])
        ) || (
          access.invites.enabled &&
          exists(/databases/$(database)/documents/invites/$(request.auth.uid))
        );
      }

      allow read: if hasAnyAccess(resource.data.access);
      allow write: if hasPermission(spaceId, 'MANAGE_SPACE');
      
      match /invites/{inviteId} {
        allow read: if hasAccess(spaceId);
        allow write: if hasPermission(spaceId, 'MANAGE_INVITES');
      }
      
      match /roles/{roleId} {
        allow read: if hasAccess(spaceId);
        allow write: if hasPermission(spaceId, 'MANAGE_ROLES');
      }
    }
  }
}
```

### Access Check Flow
1. User attempts to join space
2. System checks all enabled access methods
3. Applies composition rules
4. Determines final access decision
5. Assigns appropriate role
6. Creates audit log entry

### Role Resolution
```typescript
function resolveRole(access: SpaceAccess, user: User): string {
  let role = access.roleAssignment.defaultRole;
  let highestPriority = -1;

  for (const rule of access.roleAssignment.rules) {
    if (matchesCondition(user, rule.condition) && rule.priority > highestPriority) {
      role = rule.role;
      highestPriority = rule.priority;
    }
  }

  return role;
}
```

## UI Components

### Access Control Panel
```typescript
interface AccessControlPanel {
  sections: {
    emailList: {
      bulkUpload: boolean;
      patternInput: boolean;
      expiryPicker: boolean;
    };
    domains: {
      verificationFlow: boolean;
      subdomainToggle: boolean;
    };
    invites: {
      batchGeneration: boolean;
      templateSystem: boolean;
    };
    rules: {
      visualBuilder: boolean;
      logicTester: boolean;
    };
  };
}
```

### Access Status Display
- Combined access status indicator
- Individual method status badges
- Expiry warnings
- Role indicators
- Access method icons
- Verification status

## Future Enhancements
- Integration with Guild.xyz for token-gating
- POAP-based access control
- Temporary role assignments
- Role templates
- Advanced permission conditions
- Audit logs for access changes
- Bulk role management
- Role inheritance system 