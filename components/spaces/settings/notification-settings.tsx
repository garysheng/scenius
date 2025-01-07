'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { spacesService } from '@/lib/services/client/spaces';
import { SpaceSettings } from '@/types/spaces';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface NotificationSettingsProps {
  spaceId: string;
}

type NotificationSettings = NonNullable<SpaceSettings['notifications']>;

export function NotificationSettings({ spaceId }: NotificationSettingsProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    mentions: 'all',
    messages: 'mentions'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const loadSettings = async () => {
      try {
        const spaceSettings = await spacesService.getSpaceSettings(spaceId);
        setSettings({
          email: spaceSettings.notifications?.email ?? true,
          push: spaceSettings.notifications?.push ?? true,
          mentions: spaceSettings.notifications?.mentions ?? 'all',
          messages: spaceSettings.notifications?.messages ?? 'mentions'
        });
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [spaceId, user, authLoading, router]);

  const updateSetting = async <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    if (!user) return;

    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      await spacesService.updateSpaceSettings(spaceId, {
        notifications: updatedSettings
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      // Revert the setting if update fails
      setSettings(settings);
    }
  };

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive space updates via email
            </p>
          </div>
          <Switch
            checked={settings.email}
            onCheckedChange={(value) => updateSetting('email', value)}
          />
        </div>
      </div>

      <Separator />

      {/* Push Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications in your browser
            </p>
          </div>
          <Switch
            checked={settings.push}
            onCheckedChange={(value) => updateSetting('push', value)}
          />
        </div>
      </div>

      <Separator />

      {/* Mention Notifications */}
      <div className="space-y-4">
        <div>
          <Label>Mention Notifications</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Choose when you want to be notified about mentions
          </p>
        </div>
        <RadioGroup 
          value={settings.mentions} 
          onValueChange={(value: 'all' | 'direct' | 'none') => updateSetting('mentions', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="mention-all" />
            <Label htmlFor="mention-all">All mentions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="direct" id="mention-direct" />
            <Label htmlFor="mention-direct">Direct mentions only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="mention-none" />
            <Label htmlFor="mention-none">No mentions</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Message Notifications */}
      <div className="space-y-4">
        <div>
          <Label>Message Notifications</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which messages you want to be notified about
          </p>
        </div>
        <RadioGroup 
          value={settings.messages} 
          onValueChange={(value: 'all' | 'mentions' | 'none') => updateSetting('messages', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="msg-all" />
            <Label htmlFor="msg-all">All messages</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mentions" id="msg-mentions" />
            <Label htmlFor="msg-mentions">Only messages with mentions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="msg-none" />
            <Label htmlFor="msg-none">No messages</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
} 