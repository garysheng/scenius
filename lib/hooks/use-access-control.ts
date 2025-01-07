import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { accessControlService } from '@/lib/services/client/access-control';
import { 
  SpaceAccess, 
  Role, 
  Permission, 
  PermissionType,
  InviteLink
} from '@/types/access-control';

interface UseAccessControlProps {
  spaceId: string;
}

export function useAccessControl({ spaceId }: UseAccessControlProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accessConfig, setAccessConfig] = useState<SpaceAccess | null>(null);

  // Load access configuration
  useEffect(() => {
    if (!spaceId) return;

    const loadAccessConfig = async () => {
      try {
        setLoading(true);
        const config = await accessControlService.getSpaceAccess(spaceId);
        setAccessConfig(config);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadAccessConfig();
  }, [spaceId]);

  // Access Management
  const updateAccess = useCallback(async (updates: Partial<SpaceAccess>) => {
    if (!spaceId) return;
    try {
      await accessControlService.updateSpaceAccess(spaceId, updates);
      const updatedConfig = await accessControlService.getSpaceAccess(spaceId);
      setAccessConfig(updatedConfig);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  // Email List Management
  const addEmailToList = useCallback(async (email: string) => {
    if (!spaceId) return;
    try {
      await accessControlService.addEmailToList(spaceId, email);
      const updatedConfig = await accessControlService.getSpaceAccess(spaceId);
      setAccessConfig(updatedConfig);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  const removeEmailFromList = useCallback(async (email: string) => {
    if (!spaceId) return;
    try {
      await accessControlService.removeEmailFromList(spaceId, email);
      const updatedConfig = await accessControlService.getSpaceAccess(spaceId);
      setAccessConfig(updatedConfig);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  // Domain Management
  const addDomain = useCallback(async (domain: string, autoRole?: string) => {
    if (!spaceId) return;
    try {
      await accessControlService.addDomain(spaceId, domain, autoRole);
      const updatedConfig = await accessControlService.getSpaceAccess(spaceId);
      setAccessConfig(updatedConfig);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  // Invite Management
  const createInviteLink = useCallback(async (options: {
    maxUses?: number;
    expiresAt?: Date;
    assignedRole: string;
  }): Promise<InviteLink> => {
    if (!spaceId) throw new Error('Space ID is required');
    try {
      const invite = await accessControlService.createInviteLink(spaceId, options);
      
      // Update access config with new invite
      const updatedInvites = [...(accessConfig?.inviteLinks || []), {
        id: invite.id,
        code: invite.code,
        uses: invite.useCount,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt ? invite.expiresAt.toDate().toISOString() : null,
        isRevoked: invite.isRevoked
      }];
      
      await updateAccess({
        inviteLinks: updatedInvites
      });

      return invite;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId, accessConfig, updateAccess]);

  const revokeInviteLink = useCallback(async (inviteId: string) => {
    if (!spaceId) return;
    try {
      await accessControlService.revokeInviteLink(spaceId, inviteId);
      
      // Update access config to mark invite as revoked
      const updatedInvites = accessConfig?.inviteLinks?.map(link => 
        link.id === inviteId ? { ...link, isRevoked: true } : link
      ) || [];
      
      await updateAccess({
        inviteLinks: updatedInvites
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId, accessConfig, updateAccess]);

  // Role Management
  const createRole = useCallback(async (role: Partial<Role>): Promise<Role> => {
    if (!spaceId) throw new Error('Space ID is required');
    try {
      return await accessControlService.createRole(spaceId, role);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  const updateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    if (!spaceId) return;
    try {
      await accessControlService.updateRole(spaceId, roleId, updates);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  const deleteRole = useCallback(async (roleId: string) => {
    if (!spaceId) return;
    try {
      await accessControlService.deleteRole(spaceId, roleId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  // Permission Management
  const updatePermissions = useCallback(async (
    roleId: string, 
    permissions: Permission[]
  ) => {
    if (!spaceId) return;
    try {
      await accessControlService.updatePermissions(spaceId, roleId, permissions);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [spaceId]);

  const checkPermission = useCallback(async (
    permission: PermissionType,
    context?: { channelId?: string }
  ): Promise<boolean> => {
    if (!spaceId || !user?.id) return false;
    try {
      return await accessControlService.checkPermission(
        spaceId,
        user.id,
        permission,
        context
      );
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [spaceId, user?.id]);

  // Access Validation
  const validateAccess = useCallback(async (userId: string, email: string) => {
    if (!spaceId) return { hasAccess: false };
    try {
      return await accessControlService.validateAccess(spaceId, userId, email);
    } catch (err) {
      setError(err as Error);
      return { hasAccess: false };
    }
  }, [spaceId]);

  return {
    loading,
    error,
    accessConfig,
    updateAccess,
    addEmailToList,
    removeEmailFromList,
    addDomain,
    createInviteLink,
    revokeInviteLink,
    createRole,
    updateRole,
    deleteRole,
    updatePermissions,
    checkPermission,
    validateAccess
  };
} 