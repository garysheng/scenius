'use client';

import { useState } from 'react';
import { 
  Circle, 
  Clock, 
  MinusCircle, 
  User,
  Smile,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useAuthStore } from '@/lib/stores/auth-store';
import { presenceService } from '@/lib/services/client/presence';
import { cn } from '@/lib/utils';

export function UserStatusMenu() {
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [customStatus, setCustomStatus] = useState('');

  if (!user) return null;

  const updateStatus = async (status: 'online' | 'away' | 'dnd') => {
    if (!user || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await presenceService.updatePresence(user.id, status, customStatus || undefined);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
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
          className="relative h-12 w-full justify-start gap-2 px-3 hover:bg-muted/50"
        >
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
                <span className="text-sm font-medium text-muted-foreground">
                  {initials}
                </span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5">
              <Circle className="w-3 h-3 text-green-500 fill-current" />
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {user.username || user.fullName}
            </span>
            <span className="text-xs text-muted-foreground">
              {customStatus || 'Active'}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" alignOffset={11} forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium">Set status</p>
            <div className="flex gap-2">
              <Input
                placeholder="What's on your mind?"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="h-8 cosmic-input"
              />
              <Button 
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setCustomStatus('')}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => updateStatus('online')}
        >
          <Circle className="w-3 h-3 text-green-500 fill-current" />
          <span>Active</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => updateStatus('away')}
        >
          <Clock className="w-3 h-3 text-yellow-500" />
          <span>Away</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => updateStatus('dnd')}
        >
          <MinusCircle className="w-3 h-3 text-red-500" />
          <span>Do not disturb</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            href="/signout"
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 