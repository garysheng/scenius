'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Shield, 
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { SpaceFrontend } from '@/types';
import { spacesService } from '@/lib/services/client/spaces';

interface SpaceSettingsDialogProps {
  space: SpaceFrontend;
  trigger?: React.ReactNode;
}

export function SpaceSettingsDialog({ space, trigger }: SpaceSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || '');
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await spacesService.updateSpace(space.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      await spacesService.deleteSpace(space.id);
      router.push('/spaces');
    } catch (error) {
      console.error('Failed to delete space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors cursor-pointer">
            <Settings className="w-4 h-4" />
            <span>Space Settings</span>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Space Settings</DialogTitle>
          <DialogDescription>
            Manage your space settings and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Space Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="cosmic-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="cosmic-input min-h-[100px]"
                placeholder="Describe your space..."
              />
            </div>

            <div className="pt-4 border-t border-[hsl(var(--border-dim))]">
              <Button 
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Space
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <div className="text-center py-8 text-[hsl(var(--text-secondary))]">
              Member management coming soon
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <div className="text-center py-8 text-[hsl(var(--text-secondary))]">
              Role management coming soon
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 