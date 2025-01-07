'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Circle, 
  Clock, 
  MinusCircle,
  Smile,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/hooks/use-auth';
import { PresenceService } from '@/lib/services/client/presence';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

type Status = 'online' | 'away' | 'dnd' | 'offline';

export function UserStatusMenu() {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Status>('online');
  const [customStatus, setCustomStatus] = useState('');
  const presenceServiceRef = useRef<PresenceService | null>(null);

  // Initialize presence service when user is available
  useEffect(() => {
    if (user?.id && !presenceServiceRef.current) {
      presenceServiceRef.current = new PresenceService(user.id);
      // Set initial status
      presenceServiceRef.current.updatePresence('online');
    }

    return () => {
      if (presenceServiceRef.current) {
        presenceServiceRef.current.cleanup();
        presenceServiceRef.current = null;
      }
    };
  }, [user?.id]);

  // Debounced function to update custom status on server
  const debouncedUpdateCustomStatus = useCallback(
    debounce(async (status: string, currentUserStatus: Status) => {
      if (!presenceServiceRef.current) return;
      
      try {
        await presenceServiceRef.current.updatePresence(currentUserStatus, status || undefined);
      } catch (error) {
        console.error('Failed to update custom status:', error);
      }
    }, 500),
    []
  );

  // Set up periodic presence updates and beforeunload handler
  useEffect(() => {
    if (!user?.id || !presenceServiceRef.current) return;

    // Set up beforeunload handler
    const handleBeforeUnload = () => {
      presenceServiceRef.current?.updatePresence('offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set up periodic presence updates
    const intervalId = setInterval(() => {
      presenceServiceRef.current?.updatePresence(currentStatus);
    }, 5 * 60 * 1000); // Update every 5 minutes

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(intervalId);
      presenceServiceRef.current?.updatePresence('offline');
    };
  }, [user?.id, currentStatus]);

  if (!user) return null;

  const updateStatus = async (status: Status) => {
    if (!user || isUpdating || !presenceServiceRef.current) return;
    
    try {
      setIsUpdating(true);
      await presenceServiceRef.current.updatePresence(status, customStatus || undefined);
      setCurrentStatus(status);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCustomStatusChange = (newStatus: string) => {
    setCustomStatus(newStatus);
    if (user) {
      debouncedUpdateCustomStatus(newStatus, currentStatus);
    }
  };

  const handleClearCustomStatus = () => {
    setCustomStatus('');
    if (user && presenceServiceRef.current) {
      presenceServiceRef.current.updatePresence(currentStatus, undefined);
    }
  };

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'online':
        return <Circle className="w-3 h-3 text-green-500 fill-current" />;
      case 'away':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'dnd':
        return <MinusCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Circle className="w-3 h-3 text-gray-500" />;
    }
  };

  const initials = user.username?.slice(0, 2).toUpperCase() || 
                  user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                  '??';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative w-full h-14 justify-start gap-2 px-3 hover:bg-[hsl(var(--elevation-2))] group"
        >
          <div className="relative">
            {user.avatarUrl ? (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <Image
                  src={user.avatarUrl}
                  alt={user.username || 'User avatar'}
                  width={32}
                  height={32}
                  className="relative rounded-full ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] transition-all duration-300"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative w-8 h-8 rounded-full bg-[hsl(var(--elevation-1))] ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] flex items-center justify-center transition-all duration-300">
                  <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">
                    {initials}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5">
              {getStatusIcon()}
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-[hsl(var(--text-primary))]">
              {user.username || user.fullName}
            </span>
            <span className="text-xs text-[hsl(var(--text-secondary))]">
              {customStatus || currentStatus}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" alignOffset={11} forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium text-[hsl(var(--text-primary))]">Set status</p>
            <div className="flex gap-2">
              <Input
                placeholder="What's on your mind?"
                value={customStatus}
                onChange={(e) => handleCustomStatusChange(e.target.value)}
                className="h-8 cosmic-input"
              />
              <Button 
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
                onClick={handleClearCustomStatus}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]",
            currentStatus === 'online' && "bg-[hsl(var(--accent))/0.1"
          )}
          onClick={() => updateStatus('online')}
        >
          <Circle className="w-3 h-3 text-green-500 fill-current" />
          <span>Active</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(
            "flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]",
            currentStatus === 'away' && "bg-[hsl(var(--accent))/0.1"
          )}
          onClick={() => updateStatus('away')}
        >
          <Clock className="w-3 h-3 text-yellow-500" />
          <span>Away</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(
            "flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]",
            currentStatus === 'dnd' && "bg-[hsl(var(--accent))/0.1"
          )}
          onClick={() => updateStatus('dnd')}
        >
          <MinusCircle className="w-3 h-3 text-red-500" />
          <span>Do not disturb</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            href="/signout"
            className="flex items-center gap-2 cursor-pointer text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 