'use client';

import { useCallback } from 'react';
import { PushToTalk } from './push-to-talk';
import { useParams } from 'next/navigation';
import { messagesService } from '@/lib/services/client/messages';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/hooks/use-auth';
import { useChannel } from '@/lib/contexts/channel-context';

export function GlobalPushToTalk() {
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedChannel } = useChannel();
  const spaceId = params?.id as string;

  const handleRecordingStart = useCallback(() => {
    toast({
      description: "Recording started... Release to send",
      duration: 1000
    });
  }, [toast]);

  const handleRecordingStop = useCallback(async (audioBlob: Blob) => {
    if (!spaceId || !user || !selectedChannel) return;

    const currentChannelId = selectedChannel.id;

    try {
      const transcription = "Voice message";
      await messagesService.sendVoiceMessage(
        spaceId,
        currentChannelId,
        audioBlob,
        user.id,
        transcription
      );

      toast({
        description: "Voice message sent",
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send voice message'
      });
    }
  }, [spaceId, user, selectedChannel?.id, toast]);

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
    />
  );
} 