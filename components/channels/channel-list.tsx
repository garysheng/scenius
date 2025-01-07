'use client';

import { useEffect, useState } from 'react';
import { Hash, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ChannelFrontend, UserFrontend } from '@/types';
import { channelsService } from '@/lib/services/client/channels';
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
  const { user } = useAuth();

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channelData = await channelsService.getChannels(spaceId);
        setChannels(channelData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadChannels();
  }, [spaceId]);

  const regularChannels = channels.filter(channel => channel.kind === 'CHANNEL');
  const dmChannels = channels.filter(channel => channel.kind === 'DM');

  const getOtherParticipant = (channel: ChannelFrontend): UserFrontend | undefined => {
    if (!user || !channel.metadata.participants) return undefined;
    return channel.metadata.participants.find(p => p.id !== user.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
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
    <div className="space-y-4">
      {/* Regular Channels */}
      <div className="space-y-1">
        {regularChannels.map((channel) => {
          const isSelected = selectedChannel?.id === channel.id;
          return (
            <button
              key={channel.id}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md transition-all duration-200",
                "flex items-center gap-2 group relative",
                isSelected ? [
                  "bg-[hsl(var(--accent))/0.1",
                  "hover:bg-[hsl(var(--accent))/0.15]",
                  "text-[hsl(var(--accent))]"
                ] : [
                  "hover:bg-[hsl(var(--card-hover))]",
                  "text-[hsl(var(--text-secondary))]",
                  "hover:text-[hsl(var(--text-primary))]"
                ]
              )}
              onClick={() => onChannelSelect(channel)}
            >
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[hsl(var(--accent))] rounded-full" />
              )}
              <Hash className={cn(
                "w-4 h-4",
                isSelected ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
              )} />
              <span className={cn(
                "text-sm font-medium truncate transition-colors",
                isSelected ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
              )}>
                {channel.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* DM Channels */}
      {dmChannels.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 text-xs font-medium text-muted-foreground">
            DIRECT MESSAGES
          </div>
          {dmChannels.map((channel) => {
            const isSelected = selectedChannel?.id === channel.id;
            const otherParticipant = getOtherParticipant(channel);
            if (!otherParticipant) return null;

            return (
              <button
                key={channel.id}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md transition-all duration-200",
                  "flex items-center gap-2 group relative",
                  isSelected ? [
                    "bg-[hsl(var(--accent))/0.1",
                    "hover:bg-[hsl(var(--accent))/0.15]",
                    "text-[hsl(var(--accent))]"
                  ] : [
                    "hover:bg-[hsl(var(--card-hover))]",
                    "text-[hsl(var(--text-secondary))]",
                    "hover:text-[hsl(var(--text-primary))]"
                  ]
                )}
                onClick={() => onChannelSelect(channel)}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[hsl(var(--accent))] rounded-full" />
                )}
                <div className="relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                  {otherParticipant.avatarUrl ? (
                    <Image
                      src={otherParticipant.avatarUrl}
                      alt={otherParticipant.username || ''}
                      fill
                      className="object-cover"
                      sizes="16px"
                    />
                  ) : (
                    <MessageSquare className={cn(
                      "w-4 h-4",
                      isSelected ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
                    )} />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium truncate transition-colors",
                  isSelected ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
                )}>
                  {otherParticipant.fullName || otherParticipant.username}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
} 