'use client';

import { MessageFrontend, UserFrontend } from '@/types';
import { MessageItem } from './message-item';

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
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          user={users[message.userId]}
          spaceId={spaceId}
          onChannelSelect={onChannelSelect}
          onThreadOpen={onThreadOpen}
          isThread={isThread}
          spaceRole={spaceRole}
        />
      ))}
    </div>
  );
} 