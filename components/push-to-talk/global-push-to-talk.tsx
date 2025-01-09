'use client';

import { useCallback, useEffect, useRef } from 'react';
import { PushToTalk } from './push-to-talk';
import { useParams } from 'next/navigation';
import { messagesService } from '@/lib/services/client/messages';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/hooks/use-auth';
import { useChannel } from '@/lib/contexts/channel-context';
import { MessageFrontend, UserFrontend } from '@/types';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';

interface ThreadInfo {
  message: MessageFrontend;
  user: UserFrontend | null;
}

interface GlobalPushToTalkProps {
  activeThread?: ThreadInfo | null;
}

export function GlobalPushToTalk({ activeThread }: GlobalPushToTalkProps) {
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedChannel } = useChannel();
  const spaceId = params?.id as string;
  const channelRef = useRef(selectedChannel);
  const threadRef = useRef(activeThread);

  // Keep track of channel and thread changes
  useEffect(() => {
    console.log('Channel or thread changed:', {
      previousChannel: channelRef.current?.id,
      newChannel: selectedChannel?.id,
      previousThread: threadRef.current?.message.id,
      newThread: activeThread?.message.id
    });
    channelRef.current = selectedChannel;
    threadRef.current = activeThread;
  }, [selectedChannel, activeThread]);

  const handleRecordingStart = useCallback(() => {
    // Capture current channel and thread at start of recording
    const currentChannel = channelRef.current;
    const currentThread = threadRef.current;
    
    if (!currentChannel) {
      toast({
        variant: 'destructive',
        description: "No channel selected",
        duration: 2000
      });
      return;
    }

    console.log('Starting recording:', {
      channel: currentChannel.id,
      thread: currentThread?.message.id
    });
    
    toast({
      description: currentThread
        ? `Recording started in thread... Release to send`
        : `Recording started in #${currentChannel.name}... Release to send`,
      duration: 1000
    });
  }, [toast]);

  const handleRecordingStop = useCallback(async (audioBlob: Blob) => {
    // Get the channel and thread that were active when recording started
    const recordingChannel = channelRef.current;
    const recordingThread = threadRef.current;
    
    if (!spaceId || !user || !recordingChannel) {
      toast({
        variant: 'destructive',
        description: "No channel selected",
        duration: 2000
      });
      return;
    }

    try {
      console.log('Sending voice message:', {
        channel: recordingChannel.id,
        thread: recordingThread?.message.id
      });

      if (recordingThread) {
        // Send as thread reply
        const fileName = `${Date.now()}.webm`;
        const audioRef = ref(storage, `spaces/${spaceId}/channels/${recordingChannel.id}/voice/${fileName}`);

        // Upload with metadata
        const uploadTask = uploadBytesResumable(audioRef, audioBlob, {
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
        const messagesRef = collection(db, 'spaces', spaceId, 'channels', recordingChannel.id, 'messages');
        const parentMessageRef = doc(db, 'spaces', spaceId, 'channels', recordingChannel.id, 'messages', recordingThread.message.id);

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
            content: "Voice message",
            userId: user.id,
            channelId: recordingChannel.id,
            threadId: recordingThread.message.id,
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
                fileSize: audioBlob.size,
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
            participantIds: Array.from(new Set([...threadInfo.participantIds, user.id]))
          };

          // Write operations
          transaction.set(replyRef, newReply);
          transaction.update(parentMessageRef, {
            'metadata.threadInfo': updatedThreadInfo
          });
        });

        toast({
          description: `Voice message sent to thread`,
          duration: 2000
        });
      } else {
        // Send as regular channel message
        await messagesService.sendVoiceMessage(
          spaceId,
          recordingChannel.id,
          audioBlob,
          user.id,
          "Voice message"
        );

        toast({
          description: `Voice message sent to #${recordingChannel.name}`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send voice message'
      });
    }
  }, [spaceId, user, toast]);

  // Only show in space routes and when user is authenticated and a channel is selected
  if (!spaceId || !user || !selectedChannel) return null;

  return (
    <PushToTalk
      onRecordingStart={handleRecordingStart}
      onRecordingStop={handleRecordingStop}
      position="middle-right"
      showAudioLevel={true}
      size="medium"
      isFixed={true}
      disabled={!selectedChannel}
    />
  );
} 