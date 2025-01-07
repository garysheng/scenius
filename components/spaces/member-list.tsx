'use client';

import { useEffect, useState } from 'react';
import { Users, Circle, Clock, MinusCircle, User } from 'lucide-react';
import Image from 'next/image';
import { UserFrontend, UserPresenceFrontend } from '@/types';
import { usersService } from '@/lib/services/client/users';
import { presenceService } from '@/lib/services/client/presence';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MemberListProps {
  spaceId: string;
}

export function MemberList({ spaceId }: MemberListProps) {
  const [users, setUsers] = useState<Record<string, UserFrontend>>({});
  const [presence, setPresence] = useState<Record<string, UserPresenceFrontend>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = presenceService.subscribeToSpacePresence(spaceId, async (newPresence) => {
      setPresence(newPresence);
      
      // Load user data for any new users
      const userIds = Object.keys(newPresence);
      const newUsers: Record<string, UserFrontend> = { ...users };
      let hasNewUsers = false;

      await Promise.all(
        userIds.map(async (userId) => {
          if (!users[userId]) {
            try {
              const userData = await usersService.getUser(userId);
              newUsers[userId] = userData;
              hasNewUsers = true;
            } catch (err) {
              console.error(`Failed to load user ${userId}:`, err);
            }
          }
        })
      );

      if (hasNewUsers) {
        setUsers(newUsers);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [spaceId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Circle className="w-3 h-3 text-green-500 fill-current" />;
      case 'away':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'dnd':
        return <MinusCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Circle className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const sortedUsers = Object.entries(users).sort((a, b) => {
    // Sort by status (online first)
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
          return (
            <TooltipProvider key={userId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer group">
                    <div className="relative">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.username || 'User avatar'}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5">
                        {getStatusIcon(userPresence?.status || 'offline')}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-foreground/80">
                      {user.username || user.fullName || 'Unknown User'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  <div className="text-xs">
                    <p className="font-medium">{user.username || user.fullName}</p>
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