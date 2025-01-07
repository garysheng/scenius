'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { spacesService } from '@/lib/services/client/spaces';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

interface SettingsFormProps {
  spaceId: string;
}

export function SettingsForm({ spaceId }: SettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const loadSpace = async () => {
      try {
        const space = await spacesService.getSpace(spaceId);
        setName(space.name);
        setDescription(space.description || '');
      } catch (error) {
        console.error('Failed to load space:', error);
        if (error instanceof Error && error.message === 'You must be signed in to view a space') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && !isLoading) {
      loadSpace();
    }
  }, [spaceId, isAuthenticated, isLoading, router]);

  const handleSave = async () => {
    if (!name.trim() || saving || !isAuthenticated) return;

    try {
      setSaving(true);
      await spacesService.updateSpace(spaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to update space:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
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
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Space Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter space name"
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your space..."
            className="max-w-md min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            placeholder="Select timezone"
            className="max-w-md"
            disabled
          />
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            placeholder="Select language"
            className="max-w-md"
            disabled
          />
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 