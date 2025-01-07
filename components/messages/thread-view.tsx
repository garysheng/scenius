'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageFrontend, UserFrontend } from '@/types';
import { MessageList } from './message-list';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { messagesService } from '@/lib/services/client/messages';
import { usersService } from '@/lib/services/client/users';
import { MessageInput } from './message-input';
import { useAuth } from '@/lib/hooks/use-auth';

interface ThreadViewProps {
  spaceId: string;
  channelId: string;
  parentMessage: MessageFrontend;
  parentUser: UserFrontend | null;
  onClose: () => void;
  spaceRole?: 'owner' | 'admin' | 'member';
}

export function ThreadView({ 
  spaceId, 
  channelId, 
  parentMessage, 
  parentUser, 
  onClose,
  spaceRole
}: ThreadViewProps) {
  const [replies, setReplies] = useState<MessageFrontend[]>([]);
  const [users, setUsers] = useState<Record<string, UserFrontend>>(() => 
    parentUser ? { [parentMessage.userId]: parentUser } : {}
  );
  const { user: currentUser } = useAuth();

  // Subscribe to thread replies
  useEffect(() => {
    const unsubscribe = messagesService.subscribeToThread(
      spaceId,
      channelId,
      parentMessage.id,
      (messages) => setReplies(messages)
    );

    return () => unsubscribe();
  }, [spaceId, channelId, parentMessage.id]);

  // Load user data for replies
  useEffect(() => {
    const userIds = replies
      .map(m => m.userId)
      .filter(id => !users[id]) // Only load users we don't have
      .filter((id, index, self) => self.indexOf(id) === index);

    if (userIds.length === 0) return;

    const loadUsers = async () => {
      const newUsers: Record<string, UserFrontend> = {};
      
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await usersService.getUser(userId);
            newUsers[userId] = user;
          } catch (err) {
            console.error(`Failed to load user ${userId}:`, err);
          }
        })
      );

      if (Object.keys(newUsers).length > 0) {
        setUsers(prev => ({ ...prev, ...newUsers }));
      }
    };

    loadUsers();
  }, [replies, users]);

  const handleSendReply = useCallback(async (content: string) => {
    if (!currentUser) return;
    try {
      await messagesService.sendThreadReply(
        spaceId,
        channelId,
        parentMessage.id,
        content,
        currentUser.id
      );
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  }, [spaceId, channelId, parentMessage.id, currentUser]);

  return (
    <div className="w-[400px] flex flex-col border-l border-border/50">
      <div className="h-12 border-b border-border/50 flex items-center justify-between px-4">
        <h3 className="font-medium">Thread</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Parent Message */}
        <div className="mb-8 pb-8 border-b border-border/50">
          <MessageList
            messages={[parentMessage]}
            users={users}
            spaceId={spaceId}
            onChannelSelect={() => {}}
            isThread={true}
            spaceRole={spaceRole}
          />
        </div>

        {/* Thread Replies */}
        <MessageList
          messages={replies}
          users={users}
          spaceId={spaceId}
          onChannelSelect={() => {}}
          isThread={true}
          spaceRole={spaceRole}
        />
      </div>

      <div className="p-4 border-t border-border/50">
        <MessageInput
          placeholder="Reply to thread..."
          onSendMessage={handleSendReply}
          spaceId={spaceId}
          channelId={channelId}
        />
      </div>
    </div>
  );
} 