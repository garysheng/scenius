'use client';

import { useEffect, useRef } from 'react';
import { MessageFrontend, UserFrontend } from '@/types';
import { MessageItem } from './message-item';
import { useSearchParams } from 'next/navigation';

interface MessageListProps {
  messages: MessageFrontend[];
  users: Record<string, UserFrontend>;
  spaceId: string;
  onChannelSelect: (channelId: string) => void;
  onThreadOpen?: (message: MessageFrontend) => void;
  isThread?: boolean;
  spaceRole?: 'owner' | 'admin' | 'member';
}

export function MessageList({ 
  messages, 
  users, 
  spaceId, 
  onChannelSelect,
  onThreadOpen,
  isThread = false,
  spaceRole 
}: MessageListProps) {
  const searchParams = useSearchParams();
  const messageId = searchParams.get('message');
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});

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
            />
          </div>
        ))}
      </div>
    </div>
  );
} 