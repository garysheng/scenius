'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, MessageSquare, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from './emoji-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  onReaction: (emoji: string) => void;
  onReply: () => void;
  canDelete: boolean;
  canEdit: boolean;
  onDelete?: () => void;
  messageId: string;
  onEdit: () => void;
}

export function MessageActions({ onReaction, onReply, canDelete, canEdit, onDelete, onEdit }: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAbove, setShowAbove] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (showEmojiPicker && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const pickerHeight = 400; // Approximate height of emoji picker
      
      // If there's not enough space below, show above
      setShowAbove(rect.bottom + pickerHeight > viewportHeight);
    }
  }, [showEmojiPicker]);

  const handleSmileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Smile button clicked');
    setShowEmojiPicker(prev => !prev);
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('MessageActions - handleEmojiSelect called with:', emoji);
    onReaction(emoji);
    setShowEmojiPicker(false);
  };

  const handleEditClick = useCallback(async () => {
    try {
      setIsProcessing(true);
      await onEdit();
    } finally {
      setIsProcessing(false);
    }
  }, [onEdit]);

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete) return;
    try {
      setIsProcessing(true);
      await onDelete();
    } finally {
      setIsProcessing(false);
    }
  }, [onDelete]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative flex items-center gap-0.5 bg-[hsl(var(--card))] rounded-md shadow-lg border border-border/50",
        isProcessing && "opacity-50 pointer-events-none"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleSmileClick}
      >
        <Smile className="h-4 w-4" />
      </Button>

      {showEmojiPicker && (
        <div 
          className="absolute z-[9999] right-0"
          style={{
            [showAbove ? 'bottom' : 'top']: '100%',
            marginTop: showAbove ? undefined : '0.5rem',
            marginBottom: showAbove ? '0.5rem' : undefined
          }}
        >
          <div className="bg-[hsl(var(--background))] rounded-lg shadow-lg border border-border p-2">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onReply}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(canDelete || canEdit) && (
            <>
              {canEdit && (
                <DropdownMenuItem onClick={handleEditClick}>
                  Edit Message
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={handleDeleteClick}
                >
                  Delete Message
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 