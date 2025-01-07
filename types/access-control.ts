import { Timestamp } from 'firebase/firestore';

// Access Methods
export type AccessMethod = 'EMAIL_LIST' | 'DOMAIN' | 'INVITE';

// Email List Configuration
export interface EmailListAccess {
  enabled: boolean;
  emails: string[];
}

// Role Assignment Rules
export interface RoleAssignmentRule {
  role: string;
  priority: number;
  condition: {
    accessMethod: AccessMethod;
    domain?: string;
    inviteType?: 'ONE_TIME' | 'LIMITED' | 'PERMANENT';
  };
}

export interface RoleAssignment {
  defaultRole: string;
  rules: RoleAssignmentRule[];
}

// Space Access Configuration
export interface SpaceAccess {
  spaceId: string;
  emailList: {
    enabled: boolean;
    emails: string[];
  };
  domains: string[];
  inviteLinks: InviteLink[];
  roleAssignment: {
    defaultRole: string;
    rules: RoleAssignmentRule[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Invite Links
export interface InviteLink {
  id: string;
  spaceId: string;
  code: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  maxUses: number | null;
  useCount: number;
  isRevoked: boolean;
  assignedRole: string;
}

// Permissions
export enum PermissionType {
  // Space Management
  MANAGE_SPACE = 'MANAGE_SPACE',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_INVITES = 'MANAGE_INVITES',
  MANAGE_ACCESS = 'MANAGE_ACCESS',
  
  // Channel Management
  MANAGE_CHANNELS = 'MANAGE_CHANNELS',
  CREATE_CHANNELS = 'CREATE_CHANNELS',
  DELETE_CHANNELS = 'DELETE_CHANNELS',
  EDIT_CHANNELS = 'EDIT_CHANNELS',
  
  // Message Management
  SEND_MESSAGES = 'SEND_MESSAGES',
  MANAGE_MESSAGES = 'MANAGE_MESSAGES',
  DELETE_MESSAGES = 'DELETE_MESSAGES',
  PIN_MESSAGES = 'PIN_MESSAGES',
  
  // Member Management
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  KICK_MEMBERS = 'KICK_MEMBERS',
  BAN_MEMBERS = 'BAN_MEMBERS',
  
  // Voice & Media
  CONNECT_VOICE = 'CONNECT_VOICE',
  SPEAK_VOICE = 'SPEAK_VOICE',
  STREAM_MEDIA = 'STREAM_MEDIA',
  
  // Advanced Features
  USE_AI_FEATURES = 'USE_AI_FEATURES',
  MANAGE_INTEGRATIONS = 'MANAGE_INTEGRATIONS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS'
}

export interface Permission {
  type: PermissionType;
  allow: boolean;
  condition?: {
    channelId?: string;
    category?: string;
  };
}

// Roles
export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  position: number;
  isCustom: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Member Role Assignment
export interface MemberRole {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Timestamp;
  expiresAt?: Timestamp;
}

// Channel-specific Role Overrides
export interface ChannelRoleOverride {
  channelId: string;
  roleId: string;
  permissions: Permission[];
  updatedAt: Timestamp;
}

// Access Audit Log
export interface AccessAuditLog {
  id: string;
  spaceId: string;
  userId: string;
  action: 'GRANT' | 'REVOKE' | 'UPDATE';
  target: {
    type: 'ROLE' | 'PERMISSION' | 'INVITE' | 'DOMAIN' | 'EMAIL';
    id?: string;
    value?: string;
  };
  metadata?: Record<string, any>;
  timestamp: Timestamp;
} 