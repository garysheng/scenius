'use client';

import { useEffect, useRef } from 'react';
import { MessageFrontend, UserFrontend } from '@/types';
import { MessageItem } from './message-item';
import { useSearchParams } from 'next/navigation';
import { URL_PARAMS } from '@/lib/constants/url-params';
import { useMessagePlayback } from '@/lib/hooks/use-message-playback';
import { useAutoRespondToDM } from '@/lib/hooks/use-auto-response';
import { Button } from '@/components/ui/button';
import { VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

// Access environment variable directly from Next.js
const GARY_USER_ID = process.env.NEXT_PUBLIC_GARY_USER_ID;

interface MessageListProps {
  messages: MessageFrontend[];
  users: Record<string, UserFrontend>;
  spaceId: string;
  onChannelSelect: (channelId: string) => void;
  onThreadOpen?: (message: MessageFrontend) => void;
  isThread?: boolean;
  spaceRole?: 'owner' | 'admin' | 'member';
  channelId: string;
  channelKind?: 'CHANNEL' | 'DM';
  channelParticipantIds?: string[];
}

export function MessageList({ 
  messages, 
  users, 
  spaceId, 
  onChannelSelect,
  onThreadOpen,
  isThread = false,
  spaceRole,
  channelId,
  channelKind,
  channelParticipantIds
}: MessageListProps) {
  const searchParams = useSearchParams();
  const messageId = searchParams.get(URL_PARAMS.SEARCH.MESSAGE);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const { isPlaying, stopPlayback } = useMessagePlayback(spaceId);

  // Check if this is a DM with Gary
  const isGaryDM = GARY_USER_ID && channelKind === 'DM' && 
                   channelParticipantIds?.includes(GARY_USER_ID) || false;

  useAutoRespondToDM(messages, spaceId, channelId, isGaryDM);

  useEffect(() => {
    if (messageId && messageRefs.current[messageId]) {
      const messageElement = messageRefs.current[messageId];
      
      setTimeout(() => {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('bg-accent');
        setTimeout(() => {
          messageElement.classList.remove('bg-accent');
        }, 2000);
      }, 100);
    }
  }, [messageId, messages]);

  return (
    <div className="flex-1 relative">
      {isPlaying && (
        <div className="sticky top-4 right-4 z-50 flex justify-end px-4">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "bg-card text-muted-foreground hover:text-foreground",
              "shadow-lg border border-border/50"
            )}
            onClick={stopPlayback}
          >
            <VolumeX className="h-4 w-4 mr-2" />
            Stop Playback
          </Button>
        </div>
      )}
      <div className="space-y-4 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            ref={el => {
              if (el) messageRefs.current[message.id] = el;
            }}
            className="transition-colors duration-300"
          >
            <MessageItem
              message={message}
              user={users[message.userId]}
              spaceId={spaceId}
              onChannelSelect={onChannelSelect}
              onThreadOpen={onThreadOpen}
              isThread={isThread}
              spaceRole={spaceRole}
              allMessages={messages}
              channelId={channelId}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 