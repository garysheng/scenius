# Firestore Schema

## Collection Structure Diagram
```
spaces/
├── {spaceId}/
│   ├── (document fields)
│   │   └── name, description, avatarUrl, etc.
│   │
│   ├── access/
│   │   ├── {userId}/
│   │   │   └── role, joinedAt
│   │   │
│   │   └── config/
│   │       └── SpaceAccessConfig
│   │           ├── emailList: { enabled, emails[] }
│   │           ├── domains: string[]
│   │           ├── inviteLinks: InviteLink[]
│   │           ├── roleAssignment: { defaultRole, rules[] }
│   │           └── timestamps
│   │
│   └── channels/
│       └── {channelId}/
│           ├── (document fields)
│           │   └── name, type, etc.
│           │
│           └── members/
│               └── {userId}/
│                   └── role, joinedAt
│
users/
└── {userId}/
    └── (user profile data)

presence/
└── {userId}/
    └── (online status data)

voiceAssignments/
└── {assignmentId}/
    └── (voice channel assignment data)
```

## Collections

### `spaces`
Main collection for spaces/communities.

Document fields:
- `name`: string
- `description`: string
- `avatarUrl`: string
- `imageUrl`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `ownerId`: string
- `metadata`: {
  - `channelCount`: number
  - `memberCount`: number
}
- `settings`: {
  - `allowGuests`: boolean
  - `defaultRoleId`: string
  - `isPublic`: boolean
}

#### Subcollections

##### `access`
Stores access configuration and member records.

###### Document: `config`
Contains space access configuration:
```typescript
{
  spaceId: string;
  emailList: {
    enabled: boolean;
    emails: string[];
  };
  domains: string[];
  inviteLinks: Array<{
    id: string;
    code: string;
    createdBy: string;
    createdAt: timestamp;
    expiresAt: timestamp | null;
    maxUses: number | null;
    useCount: number;
    isRevoked: boolean;
    assignedRole: string;
  }>;
  roleAssignment: {
    defaultRole: string;
    rules: Array<{
      role: string;
      priority: number;
      condition: {
        accessMethod: 'EMAIL_LIST' | 'DOMAIN' | 'INVITE';
        domain?: string;
        inviteType?: 'ONE_TIME' | 'LIMITED' | 'PERMANENT';
      };
    }>;
  };
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

###### Member Documents
- Document ID: User ID
- Fields:
  - `role`: string ('admin' | 'member')
  - `joinedAt`: timestamp

##### `channels`
Stores channels within the space.
- Document ID: Auto-generated
- Fields:
  - `name`: string
  - `type`: string
  - `createdAt`: timestamp
  - `createdBy`: string
  - Additional fields TBD

###### Subcollections of `channels`

####### `members`
Stores channel-specific member information.
- Document ID: User ID
- Fields:
  - `role`: string
  - `joinedAt`: timestamp
  - Additional fields TBD

### `users`
Collection for user profiles.
- Document ID: Firebase Auth UID
- Fields: TBD

### `presence`
Collection for online/offline status.
- Document ID: User ID
- Fields: TBD

### `voiceAssignments`
Collection for voice channel assignments.
- Document ID: Auto-generated
- Fields: TBD

## Collection Path Examples

- Space access config: `/spaces/{spaceId}/access/config`
- Space member access: `/spaces/{spaceId}/access/{userId}`
- Channel: `/spaces/{spaceId}/channels/{channelId}`
- Channel member: `/spaces/{spaceId}/channels/{channelId}/members/{userId}` 