# Access Control System

## Overview
Scenius supports flexible access control mechanisms for spaces, allowing communities to manage their membership through composable access methods. Each method can be enabled independently and combined with custom rules.

## Implementation Progress

### Core Access Methods
- [x] Basic member roles
- [x] Role permissions
- [x] Email list control
- [x] Domain verification
- [x] Invite link system
- [ ] Custom access rules
- [x] Role assignment rules
- [ ] Auto-cleanup rules

### Email List Features
- [x] Bulk email upload
- [x] Email pattern matching
- [x] Auto role assignment
- [ ] Expiry dates
- [x] Domain override rules
- [x] Email validation
- [x] Notification system

### Domain Control Features
- [x] Domain verification flow
- [ ] Subdomain support
- [ ] Auto role assignment
- [ ] Path restrictions
- [ ] Email override support
- [ ] Verification tracking
- [ ] Domain analytics

### Invite System
- [x] Basic invite generation
- [x] Time-limited invites
- [x] Usage-limited invites
- [x] Role assignment
- [x] Invite tracking
- [x] Revocation system
- [ ] Invite analytics

### Role Management
- [x] Basic roles (Owner, Admin, Member)
- [x] Permission system
- [ ] Custom roles
- [ ] Role hierarchies
- [x] Permission inheritance
- [ ] Role analytics
- [x] Audit logging

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
  domains: string[];  // list of allowed domains
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

## Access Check Flow
1. User attempts to join space
2. System checks all enabled access methods in the following order:
   a. Direct membership check
   b. Email list validation
   c. Domain verification
   d. Invite link validation
   e. Public access check (if enabled)
3. If any access method grants permission, access is allowed
4. If no access method grants permission, access is denied
5. Access decision is logged for audit purposes

### Access Validation Implementation
```typescript
async function validateAccess(spaceId: string, userId: string, email: string): Promise<{ hasAccess: boolean }> {
  // Check membership first
  const memberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', userId));
  if (memberDoc.exists()) {
    return { hasAccess: true };
  }

  // Get access config
  const accessConfig = await getDoc(doc(db, 'spaces', spaceId, 'access', 'config'));
  if (!accessConfig.exists()) {
    return { hasAccess: false };
  }

  const config = accessConfig.data();

  // Check email list
  if (config.emailList?.enabled && config.emailList.emails.includes(email)) {
    return { hasAccess: true };
  }

  // Check domains
  if (config.domains?.length > 0) {
    const userDomain = email.split('@')[1];
    if (config.domains.includes(userDomain)) {
      return { hasAccess: true };
    }
  }

  // Check invite links
  if (config.inviteLinks?.length > 0) {
    const hasValidInvite = config.inviteLinks.some(link => 
      !link.isRevoked && 
      (!link.expiresAt || link.expiresAt > new Date()) &&
      (!link.maxUses || link.useCount < link.maxUses)
    );
    if (hasValidInvite) {
      return { hasAccess: true };
    }
  }

  return { hasAccess: false };
}
```

## Security Rules
```typescript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /spaces/{spaceId} {
      function hasAccess() {
        let config = get(/databases/$(database)/documents/spaces/$(spaceId)/access/config).data;
        
        // Check membership
        let isMember = exists(/databases/$(database)/documents/spaces/$(spaceId)/members/$(request.auth.uid));
        if (isMember) return true;
        
        // Check email list
        let emailMatch = config.emailList.enabled && 
                        config.emailList.emails.hasAny([request.auth.token.email]);
        if (emailMatch) return true;
        
        // Check domains
        let domain = request.auth.token.email.split('@')[1];
        let domainMatch = config.domains.hasAny([domain]);
        if (domainMatch) return true;
        
        // Check public access
        let isPublic = resource.data.settings.isPublic;
        if (isPublic) return true;
        
        return false;
      }

      allow read: if hasAccess();
      allow write: if hasAccess() && hasPermission('MANAGE_SPACE');
    }
  }
}
```

## Future Enhancements
- [ ] Integration with Guild.xyz for token-gating
- [ ] POAP-based access control
- [ ] Temporary role assignments
- [ ] Role templates
- [ ] Advanced permission conditions
- [ ] Bulk role management
- [ ] Role inheritance system
- [ ] Access analytics dashboard
- [ ] Automated access reviews
- [ ] Integration with SSO providers 