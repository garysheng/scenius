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
              <Circle className="w-3 h-3 text-green-500 fill-current" />
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-[hsl(var(--text-primary))]">
              {user.username || user.fullName}
            </span>
            <span className="text-xs text-[hsl(var(--text-secondary))]">
              {customStatus || 'Active'}
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
                onChange={(e) => setCustomStatus(e.target.value)}
                className="h-8 cosmic-input"
              />
              <Button 
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
                onClick={() => setCustomStatus('')}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]"
          onClick={() => updateStatus('online')}
        >
          <Circle className="w-3 h-3 text-green-500 fill-current" />
          <span>Active</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]"
          onClick={() => updateStatus('away')}
        >
          <Clock className="w-3 h-3 text-yellow-500" />
          <span>Away</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-[hsl(var(--text-primary))]"
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