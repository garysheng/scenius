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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';

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
    const userIds = [parentMessage.userId, ...replies
      .map(m => m.userId)
      .filter((id, index, self) => self.indexOf(id) === index)];

    const loadUsers = async () => {
      const newUsers: Record<string, UserFrontend> = {};
      
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            // If this is the parent user and we have their data, use that
            if (userId === parentMessage.userId && parentUser) {
              newUsers[userId] = parentUser;
            } else if (!users[userId]) { // Only load if we don't have the user data
              const user = await usersService.getUser(userId);
              newUsers[userId] = user;
            }
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
  }, [replies, parentMessage.userId, parentUser]);

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

  const handleSendVoiceReply = useCallback(async (blob: Blob, transcription: string) => {
    if (!currentUser) return;
    try {
      // Create a reference with a timestamp-based name
      const fileName = `${Date.now()}.webm`;
      const audioRef = ref(storage, `spaces/${spaceId}/channels/${channelId}/voice/${fileName}`);

      // Upload with metadata
      const uploadTask = uploadBytesResumable(audioRef, blob, {
        contentType: 'audio/webm',
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      
      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
          },
          reject,
          () => resolve()
        );
      });

      // Get the download URL
      const voiceUrl = await getDownloadURL(audioRef);

      // Create thread reply with voice message
      const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
      const parentMessageRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'messages', parentMessage.id);
      
      await runTransaction(db, async (transaction) => {
        // First, read the parent message
        const parentDoc = await transaction.get(parentMessageRef);
        if (!parentDoc.exists()) {
          throw new Error('Parent message not found');
        }

        // Get current thread info
        const threadInfo = parentDoc.data().metadata?.threadInfo || {
          replyCount: 0,
          lastReplyAt: null,
          participantIds: [parentDoc.data().userId]
        };

        // Create new voice reply message
        const replyRef = doc(messagesRef);
        const newReply = {
          content: transcription,
          userId: currentUser.id,
          channelId,
          threadId: parentMessage.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          type: 'VOICE',
          metadata: {
            reactions: {},
            edited: false,
            attachments: [{
              id: fileName,
              voiceUrl,
              fileName,
              fileSize: blob.size,
              mimeType: 'audio/webm',
              uploadStatus: 'complete' as const,
              uploadProgress: 100
            }],
            status: 'sent'
          }
        };

        // Update parent message thread info
        const updatedThreadInfo = {
          replyCount: threadInfo.replyCount + 1,
          lastReplyAt: serverTimestamp(),
          participantIds: Array.from(new Set([...threadInfo.participantIds, currentUser.id]))
        };

        // Write operations
        transaction.set(replyRef, newReply);
        transaction.update(parentMessageRef, {
          'metadata.threadInfo': updatedThreadInfo
        });
      });
    } catch (error) {
      console.error('Failed to send voice reply:', error);
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
          onSendVoiceMessage={handleSendVoiceReply}
          spaceId={spaceId}
          channelId={channelId}
        />
      </div>
    </div>
  );
} 