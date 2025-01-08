'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Play, Pause, Volume2, FileText, Paperclip, Download, ExternalLink, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { MessageFrontend, UserFrontend } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { channelsService } from '@/lib/services/client/channels';
import { cn } from '@/lib/utils';
import { messagesService } from '@/lib/services/client/messages';
import { MessageActions } from './message-actions';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBoundary } from '@/components/error-boundary';

interface MessageItemProps {
  message: MessageFrontend;
  user?: UserFrontend | null;
  spaceId: string;
  onChannelSelect: (channelId: string) => void;
  isThread?: boolean;
  onThreadOpen?: (message: MessageFrontend) => void;
  spaceRole?: 'owner' | 'admin' | 'member';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MessageItem({ 
  message, 
  user, 
  spaceId, 
  onChannelSelect,
  isThread = false,
  onThreadOpen,
  spaceRole
}: MessageItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  useEffect(() => {
    if (message.type === 'VOICE' && message.metadata.attachments?.[0]?.voiceUrl) {
      setAudioUrl(null); // Reset URL when message changes
    }
  }, [message]);

  const initials = user?.username?.slice(0, 2).toUpperCase() || 
                  user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                  '??';

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentUser || user.id === currentUser.id) return;

    try {
      const channelId = await channelsService.createDM(spaceId, [currentUser.id, user.id]);
      onChannelSelect(channelId);
    } catch (error) {
      console.error('Failed to create/open DM:', error);
    }
  };

  const downloadAndPlayAudio = async () => {
    if (!message.metadata.attachments?.[0]?.voiceUrl) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(message.metadata.attachments[0].voiceUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to download audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioUrl) {
        await downloadAndPlayAudio();
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleReaction = useCallback(async (emoji: string) => {
    if (!currentUser) return;
    console.log('MessageItem - Handling reaction:', {
      emoji,
      userId: currentUser.id,
      messageId: message.id
    });
    try {
      await messagesService.toggleReaction(
        spaceId, 
        message.channelId, 
        message.id, 
        emoji, 
        currentUser.id
      );
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }, [spaceId, message.channelId, message.id, currentUser]);

  const handleReply = useCallback(() => {
    if (!isThread && onThreadOpen) {
      onThreadOpen(message);
    }
  }, [isThread, onThreadOpen, message]);

  const renderAttachments = () => {
    if (!message.metadata.attachments?.length) return null;

    return (
      <div className="flex flex-wrap gap-3 mt-2">
        {message.metadata.attachments.map((attachment, index) => {
          const isImage = attachment.mimeType?.startsWith('image/');

          if (isImage) {
            return (
              <a
                key={`${message.id}-attachment-${index}-${attachment.fileUrl}`}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group"
              >
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-border/50">
                  <Image
                    src={attachment.thumbnailUrl || attachment.fileUrl || ''}
                    alt={attachment.fileName}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
              </a>
            );
          }

          return (
            <a
              key={`${message.id}-attachment-${index}-${attachment.fileUrl}`}
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 rounded-md p-2 transition-colors group max-w-sm"
            >
              <div className="p-2 bg-background rounded">
                {attachment.mimeType?.includes('pdf') ? (
                  <FileText className="w-6 h-6 text-destructive" />
                ) : (
                  <Paperclip className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize || 0)}
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    );
  };

  const canDelete = useCallback(() => {
    if (!currentUser) return false;
    // User can delete if they are the message author
    if (message.userId === currentUser.id) return true;
    // Or if they are an admin/owner of the space
    if (spaceRole === 'owner' || spaceRole === 'admin') return true;
    return false;
  }, [currentUser, message.userId, spaceRole]);

  const canEdit = useCallback(() => {
    if (!currentUser) return false;
    // Only message author can edit their messages
    return message.userId === currentUser.id;
  }, [currentUser, message.userId]);

  const handleDelete = useCallback(async () => {
    if (!canDelete()) return;
    
    try {
      await messagesService.deleteMessage(
        spaceId,
        message.channelId,
        message.id
      );
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [spaceId, message.channelId, message.id, canDelete, messagesService]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditContent(message.content);
  }, [message.content, setIsEditing, setEditContent]);

  const handleSaveEdit = useCallback(async () => {
    if (!currentUser) return;
    if (editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await messagesService.editMessage(
        spaceId,
        message.channelId,
        message.id,
        editContent.trim()
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, [spaceId, message.channelId, message.id, editContent, message.content, currentUser]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <ErrorBoundary>
      <div 
        className={cn(
          "group flex items-start gap-3 p-2 rounded-lg transition-all duration-300 relative message-group",
          "hover:bg-primary/10",
          "hover:shadow-[0_0_20px_rgba(147,51,234,0.15)]",
          "hover:backdrop-brightness-125",
          "cursor-pointer"
        )}
        onClick={handleAvatarClick}
      >
        <div 
          className="relative w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleAvatarClick}
        >
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.username || 'User avatar'}
              fill
              className="object-cover"
              sizes="32px"
            />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {user?.fullName || user?.username || 'Unknown User'}
              {user?.fullName && user?.username && (
                <span className="text-muted-foreground text-xs ml-1">@{user.username}</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {message.metadata.edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          {message.type === 'VOICE' ? (
            <div className="mt-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground hover:text-foreground/80"
                onClick={toggleAudio}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-foreground">
                {message.content}
              </p>
              <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {message.type === 'TEXT' && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="relative">
                      <Textarea
                        ref={editInputRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[60px] pr-16"
                        placeholder="Edit your message..."
                      />
                      <div className="absolute right-2 bottom-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mt-1 text-foreground whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )}
                  
                  {renderAttachments()}
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(message.metadata.reactions || {}).map(([emoji, userIds]) => {
                      if (userIds.length === 0) return null;
                      return (
                        <button
                          key={`${message.id}-reaction-${emoji}`}
                          onClick={() => handleReaction(emoji)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                            "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80",
                            userIds.includes(currentUser?.id || '') && "ring-1 ring-[hsl(var(--primary))]"
                          )}
                        >
                          <span>{emoji}</span>
                          <span className="text-muted-foreground">{userIds.length}</span>
                        </button>
                      );
                    })}

                    {/* Thread Reply Count - Only show if there are replies */}
                    {!isThread && message.metadata.threadInfo && message.metadata.threadInfo.replyCount > 0 && (
                      <button
                        onClick={handleReply}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors",
                          "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80",
                          "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>
                          {message.metadata.threadInfo.replyCount} {message.metadata.threadInfo.replyCount === 1 ? 'reply' : 'replies'} • {message.metadata.threadInfo.participantIds.length} {message.metadata.threadInfo.participantIds.length === 1 ? 'person' : 'people'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="opacity-0 message-group-hover:opacity-100 transition-opacity absolute right-2 top-2">
          <MessageActions
            onReaction={handleReaction}
            onReply={handleReply}
            canDelete={canDelete()}
            canEdit={canEdit()}
            onDelete={handleDelete}
            onEdit={handleEdit}
            messageId={message.id}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
} 