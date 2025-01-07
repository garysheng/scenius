'use client';

import { useState } from 'react';
import { 
  Link as LinkIcon,
  Check,
  Settings,
  MoreVertical,
  Trash2,
  LogOut,
  Users,
  Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SpaceFrontend } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/hooks/use-auth';
import { spacesService } from '@/lib/services/client/spaces';
import { useRouter } from 'next/navigation';

interface SpaceActionMenuProps {
  space: SpaceFrontend;
}

export function SpaceActionMenu({ space }: SpaceActionMenuProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || '');
  const { user } = useAuth();
  const router = useRouter();

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/spaces/join/${space.id}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const isSpaceOwner = user?.id === space.ownerId;

  const handleLeaveSpace = async () => {
    if (!user) return;
    
    try {
      await spacesService.leaveSpace(space.id, user.id);
      router.push('/spaces');
    } catch (error) {
      console.error('Failed to leave space:', error);
    }
  };

  const handleDeleteSpace = async () => {
    if (!isSpaceOwner) return;
    
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

  const handleSaveSettings = async () => {
    if (!name.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await spacesService.updateSpace(space.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setIsActionsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        className="w-8 h-8 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
        onClick={() => setIsActionsOpen(true)}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      <Dialog open={isActionsOpen} onOpenChange={setIsActionsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Space Actions</DialogTitle>
            <DialogDescription>
              Manage {space.name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="invite" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Invite
              </TabsTrigger>
              {isSpaceOwner && (
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              )}
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="invite" className="space-y-4">
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="pr-12 cosmic-input"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={handleCopyLink}
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button onClick={handleCopyLink}>
                    {isCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {isSpaceOwner && (
              <TabsContent value="settings" className="space-y-4">
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
                    onClick={handleDeleteSpace}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Space
                  </Button>
                </div>
              </TabsContent>
            )}

            <TabsContent value="members" className="mt-4">
              {isSpaceOwner ? (
                <div className="text-center py-8 text-[hsl(var(--text-secondary))]">
                  Member management coming soon
                </div>
              ) : (
                <Button 
                  variant="destructive" 
                  className="w-full justify-start gap-2"
                  onClick={handleLeaveSpace}
                  disabled={isLoading}
                >
                  <LogOut className="w-4 h-4" />
                  Leave Space
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsActionsOpen(false)}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            {isSpaceOwner && (
              <Button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 