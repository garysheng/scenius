'use client';

import { useEffect, useState } from 'react';
import { Settings, Users, Shield, Bell, Trash2, ChevronLeft } from 'lucide-react';
import { SettingsForm } from './settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MembersSettings } from './settings/members-settings';
import { AccessControlSettings } from './settings/access-control-settings';
import { NotificationSettings } from './settings/notification-settings';
import { Badge } from '@/components/ui/badge';
import { spacesService } from '@/lib/services/client/spaces';
import { SpaceFrontend } from '@/types/spaces';
import Link from 'next/link';
import { urlService } from '@/lib/services/client/url';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { accessControlService } from '@/lib/services/client/access-control';
import { PermissionType } from '@/types/access-control';

interface SettingsViewProps {
  spaceId: string;
}

export function SettingsView({ spaceId }: SettingsViewProps) {
  const [space, setSpace] = useState<SpaceFrontend | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<{
    canManageSpace: boolean;
    canManageMembers: boolean;
    canManageAccess: boolean;
  }>({
    canManageSpace: false,
    canManageMembers: false,
    canManageAccess: false,
  });
  const router = useRouter();

  useEffect(() => {
    const loadSpaceAndRole = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) return;

        const [spaceData, userRole] = await Promise.all([
          spacesService.getSpace(spaceId),
          spacesService.getMemberRole(spaceId, auth.currentUser.uid)
        ]);
        setSpace(spaceData);
        setRole(userRole);

        // Check permissions
        const [canManageSpace, canManageMembers, canManageAccess] = await Promise.all([
          accessControlService.checkPermission(spaceId, auth.currentUser.uid, PermissionType.MANAGE_SPACE),
          accessControlService.checkPermission(spaceId, auth.currentUser.uid, PermissionType.MANAGE_MEMBERS),
          accessControlService.checkPermission(spaceId, auth.currentUser.uid, PermissionType.MANAGE_ACCESS)
        ]);

        setPermissions({
          canManageSpace,
          canManageMembers,
          canManageAccess
        });
      } catch (error) {
        console.error('Failed to load space:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpaceAndRole();
  }, [spaceId]);

  const handleDeleteClick = async () => {
    if (!confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await spacesService.deleteSpace(spaceId);
      router.push(urlService.spaces.list());
    } catch (error) {
      console.error('Failed to delete space:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete space');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!space) {
    return <div>Space not found</div>;
  }

  // If user has no management permissions, redirect them
  if (!permissions.canManageSpace && !permissions.canManageMembers && !permissions.canManageAccess) {
    router.push(urlService.spaces.detail(spaceId));
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 mt-16">
      {/* Page Header */}
      <div className="mb-8 ml-8">
        <Link
          href={urlService.spaces.detail(spaceId)}
          className="flex items-center text-muted-foreground hover:text-primary mb-4 group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-0.5" />
          Back to Space
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{space.name}</h1>
          {role && (
            <Badge variant={role === 'owner' ? 'default' : 'secondary'} className="text-sm">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Manage your space settings and preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        {permissions.canManageSpace && (
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="w-6 h-6" />
                <div>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure basic settings for your space
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SettingsForm spaceId={spaceId} />
            </CardContent>
          </Card>
        )}

        {/* Members */}
        {permissions.canManageMembers && (
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6" />
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>
                    Manage members and roles in your space
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MembersSettings spaceId={spaceId} />
            </CardContent>
          </Card>
        )}

        {/* Access Control */}
        {permissions.canManageAccess && (
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6" />
                <div>
                  <CardTitle>Access Control</CardTitle>
                  <CardDescription>
                    Configure who can access your space and how
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AccessControlSettings spaceId={spaceId} />
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="w-6 h-6" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure notification preferences for this space
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <NotificationSettings spaceId={spaceId} />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {role === 'owner' && (
          <Card className="border-destructive bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-6 h-6 text-destructive" />
                <div>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Delete Space</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete a space, there is no going back. Please be certain.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete Space'
                    )}
                  </Button>
                  {deleteError && (
                    <p className="text-sm text-destructive mt-2">{deleteError}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 