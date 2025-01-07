'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  Users, 
  Link as LinkIcon,
  Check,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SpaceFrontend } from '@/types';
import { SpaceSettingsDialog } from './space-settings-dialog';

interface SpaceActionMenuProps {
  space: SpaceFrontend;
}

export function SpaceActionMenu({ space }: SpaceActionMenuProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="w-8 h-8 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            className="gap-2"
            onSelect={() => {
              setIsInviteOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            <Users className="w-4 h-4" />
            Invite People
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="gap-2"
            onSelect={handleSettingsClick}
          >
            <Settings className="w-4 h-4" />
            Space Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SpaceSettingsDialog 
        space={space} 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        trigger={
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] transition-colors cursor-pointer">
            <Settings className="w-4 h-4" />
          </div>
        }
      />

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite People</DialogTitle>
            <DialogDescription>
              Anyone with this link can join {space.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
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
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 