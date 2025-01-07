'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { channelsService } from '@/lib/services/client/channels';
import { Loader2 } from 'lucide-react';

interface CreateChannelDialogProps {
  spaceId: string;
  trigger: React.ReactNode;
  onChannelCreated?: () => void;
}

export function CreateChannelDialog({ spaceId, onChannelCreated, trigger }: CreateChannelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);

      await channelsService.createChannel(spaceId, {
        name: name.trim(),
        description: description.trim(),
        kind: 'CHANNEL',
        permissions: []
      });
      
      onChannelCreated?.();
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create channel', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Add a new channel to your space.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                placeholder="Enter channel name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="cosmic-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter channel description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="cosmic-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 