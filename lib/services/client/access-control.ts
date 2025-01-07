import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteDoc,
  getDocs,
  increment,
  collectionGroup,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  SpaceAccess, 
  InviteLink, 
  Role, 
  Permission,
  PermissionType,
  ChannelRoleOverride
} from '@/types/access-control';
import { nanoid } from 'nanoid';

export const accessControlService = {
  // Space Access Management
  async getSpaceAccess(spaceId: string): Promise<SpaceAccess | null> {
    const accessRef = doc(db, 'spaces', spaceId, 'access', 'config');
    const accessDoc = await getDoc(accessRef);
    return accessDoc.exists() ? accessDoc.data() as SpaceAccess : null;
  },

  async updateSpaceAccess(spaceId: string, access: Partial<SpaceAccess>): Promise<void> {
    const accessRef = doc(db, 'spaces', spaceId, 'access', 'config');
    const accessDoc = await getDoc(accessRef);

    if (!accessDoc.exists()) {
      // Create initial access config if it doesn't exist
      await setDoc(accessRef, {
        spaceId,
        emailList: {
          enabled: false,
          emails: []
        },
        domains: {
          enabled: false,
          domains: []
        },
        inviteLinks: [],
        roleAssignment: {
          defaultRole: 'member',
          rules: []
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...access
      });
    } else {
      await updateDoc(accessRef, {
        ...access,
        updatedAt: serverTimestamp()
      });
    }
  },

  // Email List Management
  async addEmailToList(spaceId: string, email: string): Promise<void> {
    const accessRef = doc(db, 'spaces', spaceId, 'access', 'config');
    await updateDoc(accessRef, {
      'emailList.emails': [...(await this.getSpaceAccess(spaceId))?.emailList.emails || [], email],
      'emailList.enabled': true,
      updatedAt: serverTimestamp()
    });
  },

  async removeEmailFromList(spaceId: string, email: string): Promise<void> {
    const access = await this.getSpaceAccess(spaceId);
    if (!access) return;

    const updatedEmails = access.emailList.emails.filter(e => e !== email);
    await updateDoc(doc(db, 'spaces', spaceId, 'access', 'config'), {
      'emailList.emails': updatedEmails,
      updatedAt: serverTimestamp()
    });
  },

  // Domain Management
  async addDomain(spaceId: string, domain: string, autoRole?: string): Promise<void> {
    const accessRef = doc(db, 'spaces', spaceId, 'access', 'config');
    await updateDoc(accessRef, {
      'domains.domains': [...(await this.getSpaceAccess(spaceId))?.domains.domains || [], {
        domain,
        verified: false,
        autoRole,
        allowSubdomains: false
      }],
      'domains.enabled': true,
      updatedAt: serverTimestamp()
    });
  },

  async verifyDomain(spaceId: string, domain: string): Promise<void> {
    const access = await this.getSpaceAccess(spaceId);
    if (!access) return;

    const updatedDomains = access.domains.domains.map(d => 
      d.domain === domain ? { ...d, verified: true } : d
    );

    await updateDoc(doc(db, 'spaces', spaceId, 'access', 'config'), {
      'domains.domains': updatedDomains,
      updatedAt: serverTimestamp()
    });
  },

  // Invite Management
  async createInviteLink(
    spaceId: string, 
    options: {
      maxUses?: number;
      expiresAt?: Date;
      assignedRole: string;
    }
  ): Promise<InviteLink> {
    const inviteRef = doc(collection(db, 'spaces', spaceId, 'invites'));
    const invite: InviteLink = {
      id: inviteRef.id,
      spaceId,
      code: nanoid(10),
      createdBy: 'user.id', // TODO: Get from auth context
      createdAt: Timestamp.now(),
      expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : null,
      maxUses: options.maxUses || null,
      useCount: 0,
      isRevoked: false,
      assignedRole: options.assignedRole
    };

    await setDoc(inviteRef, invite);
    return invite;
  },

  async revokeInviteLink(spaceId: string, inviteId: string): Promise<void> {
    const inviteRef = doc(db, 'spaces', spaceId, 'invites', inviteId);
    await updateDoc(inviteRef, {
      isRevoked: true,
      updatedAt: serverTimestamp()
    });
  },

  async verifyInviteLink(code: string): Promise<{
    id: string;
    spaceId: string;
    code: string;
    expiresAt: Date | null;
    maxUses: number | null;
    useCount: number;
    isRevoked: boolean;
    assignedRole: string;
  } | null> {
    try {
      console.log('Verifying invite code:', code);
      
      // Query for the invite using the code
      const invitesRef = collectionGroup(db, 'invites');
      const q = query(invitesRef, where('code', '==', code), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('No invite found with code:', code);
        return null;
      }

      const inviteDoc = snapshot.docs[0];
      const data = inviteDoc.data();
      console.log('Found invite:', data);

      // Check if invite is revoked
      if (data.isRevoked) {
        console.log('Invite is revoked:', code);
        return null;
      }

      // Check if invite has expired
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        console.log('Invite has expired:', code);
        return null;
      }

      // Check if max uses has been reached
      if (data.maxUses !== null && data.useCount >= data.maxUses) {
        console.log('Invite max uses reached:', code);
        return null;
      }

      // Get the space ID from the invite document path
      const spaceId = inviteDoc.ref.parent.parent?.id;
      if (!spaceId) {
        console.log('Could not determine space ID from invite path');
        return null;
      }

      // Increment the use count
      await updateDoc(inviteDoc.ref, {
        useCount: increment(1),
        updatedAt: serverTimestamp()
      });

      console.log('Invite verified successfully:', { spaceId, code });

      return {
        id: inviteDoc.id,
        spaceId,
        code: data.code,
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
        maxUses: data.maxUses,
        useCount: data.useCount,
        isRevoked: data.isRevoked,
        assignedRole: data.assignedRole
      };
    } catch (error) {
      console.error('Error verifying invite:', error);
      throw error;
    }
  },

  // Role Management
  async createRole(spaceId: string, role: Partial<Role>): Promise<Role> {
    const roleRef = doc(collection(db, 'spaces', spaceId, 'roles'));
    const newRole: Role = {
      id: roleRef.id,
      name: role.name || 'New Role',
      color: role.color || '#99AAB5',
      permissions: role.permissions || [],
      position: role.position || 0,
      isCustom: true,
      createdBy: 'user.id', // TODO: Get from auth context
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(roleRef, newRole);
    return newRole;
  },

  async updateRole(spaceId: string, roleId: string, updates: Partial<Role>): Promise<void> {
    const roleRef = doc(db, 'spaces', spaceId, 'roles', roleId);
    await updateDoc(roleRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteRole(spaceId: string, roleId: string): Promise<void> {
    await deleteDoc(doc(db, 'spaces', spaceId, 'roles', roleId));
  },

  // Permission Management
  async updatePermissions(
    spaceId: string, 
    roleId: string, 
    permissions: Permission[]
  ): Promise<void> {
    const roleRef = doc(db, 'spaces', spaceId, 'roles', roleId);
    await updateDoc(roleRef, {
      permissions,
      updatedAt: serverTimestamp()
    });
  },

  async checkPermission(
    spaceId: string, 
    userId: string, 
    permission: PermissionType, 
    context?: { channelId?: string }
  ): Promise<boolean> {
    try {
      // Get user's roles in the space
      const memberRolesRef = collection(db, 'spaces', spaceId, 'members');
      const memberDoc = await getDoc(doc(memberRolesRef, userId));
      
      if (!memberDoc.exists()) {
        return false; // User is not a member of the space
      }

      const memberData = memberDoc.data();
      const userRole = memberData.role;

      // Get the role document
      const roleRef = doc(db, 'spaces', spaceId, 'roles', userRole);
      const roleDoc = await getDoc(roleRef);

      if (!roleDoc.exists()) {
        return false; // Role doesn't exist
      }

      const roleData = roleDoc.data() as Role;

      // Check if the role has the required permission
      const hasPermission = roleData.permissions.some(p => {
        // Base permission match
        const permissionMatch = p.type === permission && p.allow;

        // If there's a context and the permission has conditions, check them
        if (permissionMatch && context && p.condition) {
          if (context.channelId && p.condition.channelId) {
            return p.condition.channelId === context.channelId;
          }
        }

        return permissionMatch;
      });

      // If no direct permission, check for channel-specific overrides
      if (!hasPermission && context?.channelId) {
        const overrideRef = doc(
          db, 
          'spaces', 
          spaceId, 
          'channels', 
          context.channelId, 
          'roleOverrides', 
          userRole
        );
        const overrideDoc = await getDoc(overrideRef);

        if (overrideDoc.exists()) {
          const override = overrideDoc.data() as ChannelRoleOverride;
          return override.permissions.some(p => p.type === permission && p.allow);
        }
      }

      return hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  },

  // Access Validation
  async validateAccess(spaceId: string, userId: string, email: string): Promise<{
    hasAccess: boolean;
    role?: string;
    method?: 'EMAIL_LIST' | 'DOMAIN' | 'INVITE';
  }> {
    const access = await this.getSpaceAccess(spaceId);
    if (!access) return { hasAccess: false };

    let highestPriorityRole = {
      role: access.roleAssignment.defaultRole,
      priority: -1
    };

    // Check email list
    if (access.emailList.enabled && access.emailList.emails.includes(email)) {
      const rule = access.roleAssignment.rules.find(r => 
        r.condition.accessMethod === 'EMAIL_LIST' &&
        r.priority > highestPriorityRole.priority
      );
      if (rule) {
        highestPriorityRole = { role: rule.role, priority: rule.priority };
      }
      return { hasAccess: true, role: highestPriorityRole.role, method: 'EMAIL_LIST' };
    }

    // Check domains
    if (access.domains.enabled) {
      const emailDomain = email.split('@')[1];
      const matchingDomain = access.domains.domains.find(d => 
        d.domain === emailDomain
      );
      if (matchingDomain) {
        const rule = access.roleAssignment.rules.find(r => 
          r.condition.accessMethod === 'DOMAIN' &&
          r.priority > highestPriorityRole.priority
        );
        if (rule) {
          highestPriorityRole = { role: rule.role, priority: rule.priority };
        }
        return { hasAccess: true, role: highestPriorityRole.role, method: 'DOMAIN' };
      }
    }

    // Check invites
    const invitesRef = collection(db, 'spaces', spaceId, 'invites');
    const invitesQuery = query(
      invitesRef,
      where('isRevoked', '==', false),
      where('expiresAt', '>', Timestamp.now()),
      where('useCount', '<', 'maxUses')
    );

    const invitesSnapshot = await getDocs(invitesQuery);
    
    for (const inviteDoc of invitesSnapshot.docs) {
      const invite = inviteDoc.data() as InviteLink;
      
      // Skip if invite has reached max uses
      if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
        continue;
      }

      // Skip if invite is expired
      if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
        continue;
      }

      const rule = access.roleAssignment.rules.find(r => 
        r.condition.accessMethod === 'INVITE' &&
        r.priority > highestPriorityRole.priority
      );
      
      if (rule) {
        highestPriorityRole = { role: rule.role, priority: rule.priority };
      }

      // Update use count
      await updateDoc(inviteDoc.ref, {
        useCount: increment(1),
        updatedAt: serverTimestamp()
      });

      return { 
        hasAccess: true, 
        role: invite.assignedRole || highestPriorityRole.role, 
        method: 'INVITE' 
      };
    }

    return { hasAccess: false };
  }
}; 