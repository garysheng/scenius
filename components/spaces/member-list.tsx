'use client';

import { useEffect, useState } from 'react';
import { Circle, Clock, MinusCircle, User } from 'lucide-react';
import Image from 'next/image';
import { UserFrontend, UserPresenceFrontend, ChannelFrontend } from '@/types';
import { usersService } from '@/lib/services/client/users';
import { PresenceService } from '@/lib/services/client/presence';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { channelsService } from '@/lib/services/client/channels';
import { readStatusService } from '@/lib/services/client/read-status';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

interface MemberListProps {
  spaceId: string;
  selectedChannel: ChannelFrontend | null;
  onChannelSelect: (channel: ChannelFrontend) => void;
}

export function MemberList({ spaceId, selectedChannel, onChannelSelect }: MemberListProps) {
  const [users, setUsers] = useState<Record<string, UserFrontend>>({});
  const [presence, setPresence] = useState<Record<string, UserPresenceFrontend>>({});
  const [dmChannels, setDmChannels] = useState<ChannelFrontend[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, Date | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [presenceService, setPresenceService] = useState<PresenceService | null>(null);

  // Initialize presence service when user is available
  useEffect(() => {
    if (currentUser) {
      const service = new PresenceService(currentUser.id);
      setPresenceService(service);
      return () => service.cleanup();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!presenceService || !currentUser) return;

    const unsubscribePromises: Promise<() => void>[] = [];

    // Subscribe to presence for each user
    Object.keys(users).forEach(userId => {
      const promise = new Promise<() => void>((resolve) => {
        const unsubscribe = presenceService.subscribeToPresence(userId, (newPresence) => {
          setPresence(prev => ({
            ...prev,
            [userId]: {
              ...newPresence,
              updatedAt: newPresence.updatedAt || new Date()
            }
          }));
        });
        resolve(unsubscribe);
      });
      unsubscribePromises.push(promise);
    });

    Promise.all(unsubscribePromises).then(unsubscribeFunctions => {
      return () => {
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };
    });
  }, [presenceService, users, currentUser]);

  // Load DM channels and subscribe to read status
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeChannels: (() => void) | undefined;
    let unsubscribeReadStatus: (() => void) | undefined;

    const setupSubscriptions = async () => {
      try {
        // Subscribe to DM channels
        unsubscribeChannels = channelsService.subscribeToChannels(spaceId, (channelData) => {
          const dms = channelData.filter(channel => channel.kind === 'DM');
          setDmChannels(dms);
        });

        // Subscribe to read status updates
        unsubscribeReadStatus = readStatusService.subscribeToReadStatus(spaceId, currentUser.id, (statuses) => {
          setReadStatus(statuses);
        });
      } catch (err) {
        console.error('Failed to load DM channels:', err);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeChannels) {
        unsubscribeChannels();
      }
      if (unsubscribeReadStatus) {
        unsubscribeReadStatus();
      }
    };
  }, [spaceId, currentUser]);

  // Mark channel as read when selected
  useEffect(() => {
    if (selectedChannel && currentUser && selectedChannel.kind === 'DM') {
      readStatusService.markAsRead(spaceId, selectedChannel.id, currentUser.id);
      setReadStatus(prev => ({
        ...prev,
        [selectedChannel.id]: new Date()
      }));
    }
  }, [selectedChannel, spaceId, currentUser]);

  // Load users for the space
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const spaceUsers = await usersService.getSpaceUsers(spaceId);
        setUsers(spaceUsers);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load users:', error);
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [spaceId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 text-green-500 fill-current" />;
      case 'away':
        return <Clock className="w-2 h-2 text-yellow-500" />;
      case 'dnd':
        return <MinusCircle className="w-2 h-2 text-red-500" />;
      default:
        return <Circle className="w-2 h-2 text-muted-foreground" />;
    }
  };

  const isUnread = (userId: string): boolean => {
    if (!currentUser) return false;
    const dmChannel = dmChannels.find(channel => 
      channel.metadata.participantIds?.includes(userId) && 
      channel.metadata.participantIds?.includes(currentUser.id)
    );
    if (!dmChannel) return false;
    
    const lastRead = readStatus[dmChannel.id];
    // Return false if there's no last message
    if (!dmChannel.metadata.lastMessageAt) return false;
    
    // Add check for last message sender - if it's the current user, it's not unread
    if (dmChannel.metadata.lastMessageSenderId === currentUser.id) return false;
    
    // Only mark as unread if there's no last read time and there is a message
    if (!lastRead && dmChannel.metadata.lastMessageAt) return true;
    
    return lastRead ? dmChannel.metadata.lastMessageAt > lastRead : false;
  };

  const handleMemberClick = async (userId: string) => {
    if (!currentUser || userId === currentUser.id) return;
    
    try {
      // Check if DM already exists
      const existingDM = dmChannels.find(channel => 
        channel.metadata.participantIds?.includes(userId) && 
        channel.metadata.participantIds?.includes(currentUser.id)
      );

      if (existingDM) {
        onChannelSelect(existingDM);
      } else {
        const channelId = await channelsService.createDM(spaceId, [currentUser.id, userId]);
        const channel = await channelsService.getChannel(spaceId, channelId);
        onChannelSelect(channel);
      }
    } catch (error) {
      console.error('Failed to create/open DM:', error);
    }
  };

  const sortedUsers = Object.entries(users).sort((a, b) => {
    // Current user should always be first
    if (a[0] === currentUser?.id) return -1;
    if (b[0] === currentUser?.id) return 1;

    // Then sort by whether they have an active DM
    const aHasDM = dmChannels.some(channel => 
      channel.metadata.participantIds?.includes(a[0]) && 
      channel.metadata.participantIds?.includes(currentUser?.id || '')
    );
    const bHasDM = dmChannels.some(channel => 
      channel.metadata.participantIds?.includes(b[0]) && 
      channel.metadata.participantIds?.includes(currentUser?.id || '')
    );
    if (aHasDM && !bHasDM) return -1;
    if (!aHasDM && bHasDM) return 1;

    // Then by status (online first)
    const statusA = presence[a[0]]?.status || 'offline';
    const statusB = presence[b[0]]?.status || 'offline';
    if (statusA === 'online' && statusB !== 'online') return -1;
    if (statusA !== 'online' && statusB === 'online') return 1;
    
    // Then by username
    return (a[1].username || a[1].fullName || '').localeCompare(b[1].username || b[1].fullName || '');
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="space-y-1 p-2">
        {sortedUsers.map(([userId, user]) => {
          const userPresence = presence[userId];
          const dmChannel = dmChannels.find(channel => 
            channel.metadata.participantIds?.includes(userId) && 
            channel.metadata.participantIds?.includes(currentUser?.id || '')
          );
          // Only highlight if this is the other participant in the selected DM
          const isSelected = selectedChannel?.id === dmChannel?.id && 
                           selectedChannel?.kind === 'DM' && 
                           userId !== currentUser?.id;
          const unread = isUnread(userId);

          return (
            <TooltipProvider key={userId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md transition-all duration-200",
                      "flex items-center gap-2 group relative",
                      isSelected ? [
                        "bg-gradient-to-r from-[hsl(var(--ai-primary))] to-[hsl(var(--ai-secondary))]",
                        "hover:from-[hsl(var(--ai-primary))] hover:to-[hsl(var(--accent-nebula))]",
                        "text-white",
                        "animate-gradient-x"
                      ] : [
                        "hover:bg-[hsl(var(--card-hover))]",
                        "text-[hsl(var(--text-secondary))]",
                        "hover:text-[hsl(var(--text-primary))]"
                      ]
                    )}
                    onClick={() => handleMemberClick(userId)}
                  >
                    {/* Add subtle gradient overlay for hover effect on non-selected items */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--ai-primary))] via-[hsl(var(--accent-nebula))] to-[hsl(var(--ai-secondary))] opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-md" />
                    )}
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full" />
                    )}
                    <div className="relative">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.username || 'User avatar'}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                          <User className={cn(
                            "w-2 h-2",
                            isSelected ? "text-white" : "text-muted-foreground"
                          )} />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-[1px]">
                        {getStatusIcon(userPresence?.status || 'offline')}
                      </div>
                    </div>
                    <span className={cn(
                      "text-sm truncate transition-colors",
                      unread && !isSelected && userId !== currentUser?.id && "font-bold !text-white",
                      !unread && "font-light",
                      isSelected ? "text-white" : "text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-primary))]"
                    )}>
                      {user.fullName || user.username || 'Unknown User'}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  <div className="text-xs">
                    <p className="font-medium">
                      {user.fullName || user.username}
                      {user.fullName && user.username && (
                        <span className="text-muted-foreground ml-1">@{user.username}</span>
                      )}
                    </p>
                    {userPresence?.customStatus && (
                      <p className="text-muted-foreground mt-1">{userPresence.customStatus}</p>
                    )}
                    {userPresence?.status === 'offline' && userPresence?.lastSeen && (
                      <p className="text-muted-foreground mt-1">
                        Last seen: {userPresence.lastSeen.toLocaleString()}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </ScrollArea>
  );
} 