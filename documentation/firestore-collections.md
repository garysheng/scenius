# Firestore Collection Structure

## Collection Hierarchy

```
spaces/
├── {spaceId}/                      # Space document
│   ├── channels/                   # Subcollection
│   │   ├── {channelId}/           # Channel document
│   │   │   └── messages/          # Subcollection
│   │   │       └── {messageId}    # Message document
│   │   └── ...
│   │
│   ├── members/                    # Subcollection
│   │   └── {userId}/              # Member document
│   │
│   └── summaries/                  # Subcollection
│       └── {summaryId}/           # Summary document
│
users/
├── {userId}/                       # User document
│   └── preferences/               # Subcollection
│       └── {preferenceId}        # Preference document
│
voiceAssignments/
└── {spaceId}_{userId}             # Voice Assignment document
```

## Key Collection Paths

### Messages
- Full path: `spaces/{spaceId}/channels/{channelId}/messages/{messageId}`
- Messages are stored within channels, which are within spaces
- This is a deeply nested structure (3 levels deep)

### Voice Assignments
- Full path: `voiceAssignments/{spaceId}_{userId}`
- Top-level collection for voice assignments
- Document ID is a composite of spaceId and userId

### Users
- Full path: `users/{userId}`
- Top-level collection for user data
- Contains basic user information and preferences

### Space Members
- Full path: `spaces/{spaceId}/members/{userId}`
- Subcollection under each space
- Contains member-specific data for that space

## Important Notes

1. Message Access:
   - To access messages, you need:
     - Space ID
     - Channel ID
     - Message ID
   - Always traverse the full path: space → channel → messages

2. Voice Assignment Access:
   - Single collection lookup using composite key
   - Format: `{spaceId}_{userId}`
   - Faster than nested collections for voice lookups

3. Member Access:
   - Two ways to get user data:
     - User profile: `users/{userId}`
     - Space membership: `spaces/{spaceId}/members/{userId}`

## Collection Group Queries
When querying across all messages in all channels in all spaces:
```typescript
const messagesRef = collectionGroup(db, 'messages');
```

This is useful for global searches but should be used carefully due to performance implications. 