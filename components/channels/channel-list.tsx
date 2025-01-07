'use client';

import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ChannelFrontend } from '@/types';
import { channelsService } from '@/lib/services/client/channels';
import { readStatusService } from '@/lib/services/client/read-status';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';

interface ChannelListProps {
  spaceId: string;
  selectedChannel: ChannelFrontend | null;
  onChannelSelect: (channel: ChannelFrontend) => void;
}

export function ChannelList({ spaceId, selectedChannel, onChannelSelect }: ChannelListProps) {
  const [channels, setChannels] = useState<ChannelFrontend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readStatus, setReadStatus] = useState<Record<string, Date | null>>({});
  const { user } = useAuth();

  useEffect(() => {
    const loadChannels = async () => {
      try {
        // Subscribe to channel updates
        const unsubscribeChannels = channelsService.subscribeToChannels(spaceId, (channelData) => {
          setChannels(channelData);
          setIsLoading(false);
        });

        // Subscribe to read status updates
        const unsubscribeReadStatus = user ? 
          readStatusService.subscribeToReadStatus(spaceId, user.id, (statuses) => {
            setReadStatus(statuses);
          }) : undefined;

        return () => {
          unsubscribeChannels();
          if (unsubscribeReadStatus) {
            unsubscribeReadStatus();
          }
        };
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
        setIsLoading(false);
      }
    };

    loadChannels();
  }, [spaceId, user]);

  // Mark channel as read when selected
  useEffect(() => {
    if (!selectedChannel || !user) return;

    const channelId = selectedChannel.id;
    const userId = user.id;
    
    // Update read status
    readStatusService.markAsRead(spaceId, channelId, userId);
    
    // Use functional update to prevent unnecessary re-renders
    setReadStatus(prev => {
      const newStatus = { ...prev };
      newStatus[channelId] = new Date();
      return newStatus;
    });
  }, [selectedChannel?.id, spaceId, user?.id]); // More specific dependencies

  const regularChannels = channels.filter(channel => channel.kind === 'CHANNEL');

  const isUnread = (channel: ChannelFrontend): boolean => {
    const lastRead = readStatus[channel.id];
    if (!lastRead && channel.metadata.lastMessageAt) return true;
    if (!channel.metadata.lastMessageAt) return false;
    return lastRead ? channel.metadata.lastMessageAt > lastRead : false;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(1)].map((_, i) => (
          <Card
            key={i}
            className="h-12 cosmic-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {regularChannels.map((channel) => {
        const isSelected = selectedChannel?.id === channel.id;
        const unread = isUnread(channel);
        
        return (
          <button
            key={channel.id}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md transition-all duration-200",
              "flex items-center gap-2 group relative",
              isSelected ? [
                "bg-[hsl(var(--primary))]",
                "hover:bg-[hsl(var(--primary))]",
                "text-white"
              ] : [
                "hover:bg-[hsl(var(--card-hover))]",
                "text-[hsl(var(--text-secondary))]",
                "hover:text-[hsl(var(--text-primary))]"
              ]
            )}
            onClick={() => onChannelSelect(channel)}
          >
            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full" />
            )}
            <Hash className={cn(
              "w-4 h-4",
              isSelected ? "text-white" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
            )} />
            <span className={cn(
              "text-sm truncate transition-colors",
              unread && !isSelected && "font-bold !text-white",
              isSelected ? "text-white" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
            )}>
              {channel.name}
            </span>
          </button>
        );
      })}
    </div>
  );
} 