import { Permission, PermissionType } from '@/types/access-control';

export const DEFAULT_ROLE_PERMISSIONS: Record<'owner' | 'admin' | 'member', Permission[]> = {
  owner: [
    // Space Management
    { type: PermissionType.MANAGE_SPACE, allow: true },
    { type: PermissionType.MANAGE_ROLES, allow: true },
    { type: PermissionType.MANAGE_INVITES, allow: true },
    { type: PermissionType.MANAGE_ACCESS, allow: true },
    
    // Channel Management
    { type: PermissionType.MANAGE_CHANNELS, allow: true },
    { type: PermissionType.CREATE_CHANNELS, allow: true },
    { type: PermissionType.DELETE_CHANNELS, allow: true },
    { type: PermissionType.EDIT_CHANNELS, allow: true },
    
    // Message Management
    { type: PermissionType.SEND_MESSAGES, allow: true },
    { type: PermissionType.MANAGE_MESSAGES, allow: true },
    { type: PermissionType.DELETE_MESSAGES, allow: true },
    { type: PermissionType.PIN_MESSAGES, allow: true },
    
    // Member Management
    { type: PermissionType.MANAGE_MEMBERS, allow: true },
    { type: PermissionType.KICK_MEMBERS, allow: true },
    { type: PermissionType.BAN_MEMBERS, allow: true },
    
    // Voice & Media
    { type: PermissionType.CONNECT_VOICE, allow: true },
    { type: PermissionType.SPEAK_VOICE, allow: true },
    { type: PermissionType.STREAM_MEDIA, allow: true },
    
    // Advanced Features
    { type: PermissionType.USE_AI_FEATURES, allow: true },
    { type: PermissionType.MANAGE_INTEGRATIONS, allow: true },
    { type: PermissionType.VIEW_ANALYTICS, allow: true }
  ],

  admin: [
    // Space Management
    { type: PermissionType.MANAGE_SPACE, allow: true },
    { type: PermissionType.MANAGE_INVITES, allow: true },
    
    // Channel Management
    { type: PermissionType.MANAGE_CHANNELS, allow: true },
    { type: PermissionType.CREATE_CHANNELS, allow: true },
    { type: PermissionType.EDIT_CHANNELS, allow: true },
    
    // Message Management
    { type: PermissionType.SEND_MESSAGES, allow: true },
    { type: PermissionType.MANAGE_MESSAGES, allow: true },
    { type: PermissionType.DELETE_MESSAGES, allow: true },
    { type: PermissionType.PIN_MESSAGES, allow: true },
    
    // Member Management
    { type: PermissionType.KICK_MEMBERS, allow: true },
    
    // Voice & Media
    { type: PermissionType.CONNECT_VOICE, allow: true },
    { type: PermissionType.SPEAK_VOICE, allow: true },
    { type: PermissionType.STREAM_MEDIA, allow: true },
    
    // Advanced Features
    { type: PermissionType.USE_AI_FEATURES, allow: true },
    { type: PermissionType.VIEW_ANALYTICS, allow: true }
  ],

  member: [
    // Message Management
    { type: PermissionType.SEND_MESSAGES, allow: true },
    
    // Voice & Media
    { type: PermissionType.CONNECT_VOICE, allow: true },
    { type: PermissionType.SPEAK_VOICE, allow: true },
    { type: PermissionType.STREAM_MEDIA, allow: true },
    
    // Advanced Features
    { type: PermissionType.USE_AI_FEATURES, allow: true }
  ]
}; 