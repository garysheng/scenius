'use client';

import { useRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import Image from 'next/image';
import { MessageFrontend, UserFrontend } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { channelsService } from '@/lib/services/client/channels';

interface MessageItemProps {
  message: MessageFrontend;
  user?: UserFrontend | null;
  spaceId: string;
}

export function MessageItem({ message, user, spaceId }: MessageItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const initials = user?.username?.slice(0, 2).toUpperCase() || 
                  user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                  '??';

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentUser || user.id === currentUser.id) return;

    try {
      const channelId = await channelsService.createDM(spaceId, [currentUser.id, user.id]);
      router.push(`/spaces/${spaceId}/channels/${channelId}`);
    } catch (error) {
      console.error('Failed to create/open DM:', error);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="flex items-start gap-3 group hover:bg-[hsl(var(--card-hover))] p-2 rounded-lg transition-colors">
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
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            {message.metadata.attachments?.[0]?.transcription && (
              <p className="text-sm text-muted-foreground">
                {message.metadata.attachments[0].transcription}
              </p>
            )}
            <audio
              ref={audioRef}
              src={message.metadata.attachments?.[0]?.voiceUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </div>
        ) : (
          <p className="text-sm mt-1 text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
} 