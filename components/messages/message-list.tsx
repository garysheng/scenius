'use client';

import { useEffect, useRef } from 'react';
import { MessageFrontend, UserFrontend } from '@/types';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: MessageFrontend[];
  users: Record<string, UserFrontend>;
  spaceId: string;
}

export function MessageList({ messages, users, spaceId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No messages yet. Start the conversation!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((message) => (
        <MessageItem 
          key={message.id} 
          message={message}
          user={users[message.userId]}
          spaceId={spaceId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 