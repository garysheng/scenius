'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Channel } from '@/types';
import { channelsService } from '@/lib/services/client/channels';

interface CreateChannelDialogProps {
  spaceId: string;
  trigger: React.ReactNode;
  onChannelCreated?: () => void;
}

type CreateChannelFormValues = Omit<Channel, 'id' | 'spaceId' | 'createdAt' | 'updatedAt' | 'metadata'>;

export function CreateChannelDialog({ spaceId, trigger, onChannelCreated }: CreateChannelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateChannelFormValues>({
    defaultValues: {
      name: '',
      description: '',
      type: 'TEXT'
    }
  });

  const onSubmit = async (data: CreateChannelFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await channelsService.createChannel(spaceId, data);
      setIsOpen(false);
      onChannelCreated?.();
      form.reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="cosmic-card">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              className="cosmic-input"
              placeholder="Enter channel name"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              className="cosmic-input min-h-[100px]"
              placeholder="Describe your channel"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 