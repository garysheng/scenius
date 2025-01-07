import { useState, useEffect } from 'react';
import { Role, Permission, PermissionType } from '@/types/access-control';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface RolePermissionsModalProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (permissions: Permission[]) => Promise<void>;
}

export function RolePermissionsModal({
  role,
  open,
  onOpenChange,
  onSave
}: RolePermissionsModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setPermissions(role.permissions);
    }
  }, [role]);

  const handleTogglePermission = (type: PermissionType) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.type === type);
      if (existing) {
        return prev.map(p =>
          p.type === type ? { ...p, allow: !p.allow } : p
        );
      } else {
        return [...prev, { type, allow: true }];
      }
    });
  };

  const handleSave = async () => {
    if (!role) return;
    try {
      setSaving(true);
      await onSave(permissions);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const permissionCategories = {
    'Space Management': [
      PermissionType.MANAGE_SPACE,
      PermissionType.MANAGE_ROLES,
      PermissionType.MANAGE_INVITES,
      PermissionType.MANAGE_ACCESS,
    ],
    'Channel Management': [
      PermissionType.MANAGE_CHANNELS,
      PermissionType.CREATE_CHANNELS,
      PermissionType.DELETE_CHANNELS,
      PermissionType.EDIT_CHANNELS,
    ],
    'Message Management': [
      PermissionType.SEND_MESSAGES,
      PermissionType.MANAGE_MESSAGES,
      PermissionType.DELETE_MESSAGES,
      PermissionType.PIN_MESSAGES,
    ],
    'Member Management': [
      PermissionType.MANAGE_MEMBERS,
      PermissionType.KICK_MEMBERS,
      PermissionType.BAN_MEMBERS,
    ],
    'Voice & Media': [
      PermissionType.CONNECT_VOICE,
      PermissionType.SPEAK_VOICE,
      PermissionType.STREAM_MEDIA,
    ],
    'Advanced Features': [
      PermissionType.USE_AI_FEATURES,
      PermissionType.MANAGE_INTEGRATIONS,
      PermissionType.VIEW_ANALYTICS,
    ],
  };

  const formatPermissionName = (permission: string) => {
    return permission
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: role.color }}
            />
            <span>Edit Permissions for {role.name}</span>
            {!role.isCustom && (
              <Badge variant="secondary" className="ml-2">
                Default
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure which actions members with this role can perform
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(permissionCategories).map(([category, perms]) => (
              <div key={category} className="space-y-4">
                <h4 className="font-medium text-sm">{category}</h4>
                <div className="space-y-2">
                  {perms.map(permission => {
                    const isAllowed = permissions.find(
                      p => p.type === permission
                    )?.allow;
                    return (
                      <div
                        key={permission}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm">
                            {formatPermissionName(permission)}
                          </div>
                        </div>
                        <Switch
                          checked={isAllowed}
                          onCheckedChange={() => handleTogglePermission(permission)}
                        />
                      </div>
                    );
                  })}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 