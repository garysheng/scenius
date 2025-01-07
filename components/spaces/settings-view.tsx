'use client';

import { Settings, Users, Shield, Bell, Trash2 } from 'lucide-react';
import { SettingsForm } from './settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MembersSettings } from './settings/members-settings';
import { AccessControlSettings } from './settings/access-control-settings';
import { NotificationSettings } from './settings/notification-settings';
interface SettingsViewProps {
  spaceId: string;
}

export function SettingsView({ spaceId }: SettingsViewProps) {
  const handleDeleteClick = () => {
    // TODO: Implement delete space functionality
    console.log('Delete space clicked');
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 mt-16">
      {/* Page Header */}
      <div className="mb-8 ml-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your space settings and preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <Card>
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

        {/* Members */}
        <Card>
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

        {/* Access Control */}
        <Card>
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

        {/* Notifications */}
        <Card>
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
        <Card className="border-destructive">
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
                >
                  Delete Space
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 