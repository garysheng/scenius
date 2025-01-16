import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageFrontend } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { messagesService } from '@/lib/services/client/messages';
import { useAuth } from '@/lib/hooks/use-auth';

interface VideoReplyButtonProps {
  spaceId: string;
  channelId: string;
  messages?: MessageFrontend[];
  className?: string;
  transcript?: string;
  onMessageSent?: () => void;
}

export function VideoReplyButton({ 
  spaceId, 
  channelId, 
  messages = [], 
  className,
  transcript = '', // Default to empty string
  onMessageSent
}: VideoReplyButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleGenerateVideo = async () => {
    if (!user) return;
    
    try {
      setIsGenerating(true);
      const latestMessage = messages[messages.length - 1];
      
      // Use transcript if available (even if empty), otherwise use latest message
      const content = transcript !== undefined ? transcript : latestMessage?.content;

      // Only show toast if we're actually going to make the request
      toast({
        title: "Generating Video Response",
        description: "Your video response is being generated. This may take a few minutes.",
      });

      console.log('Generating video for message:', {
        spaceId,
        channelId,
        content,
        userId: latestMessage?.userId,
        hasTranscript: !!transcript,
        transcriptLength: transcript?.length,
        messagesLength: messages.length
      });

      const response = await fetch('/api/auto-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId,
          channelId,
          content,
          userId: user.id,
          useHistory: !transcript // Only use history if no transcript provided
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video reply');
      }

      console.log('Video reply generated:', data);

      // Create video attachment
      const videoAttachment = {
        id: crypto.randomUUID(),
        fileUrl: data.video_url,
        fileName: 'video-response.mp4',
        fileSize: 0, // Size unknown at this point
        mimeType: 'video/mp4',
        uploadStatus: 'complete' as const,
        uploadProgress: 100
      };

      // Send message with video attachment
      await messagesService.sendMessage(
        spaceId,
        channelId,
        data.transcript || 'Here\'s my video response:', // Use transcript from response or default text
        user.id,
        [videoAttachment]
      );

      // Clear input on success
      onMessageSent?.();
 
      // Show success toast
      toast({
        title: "Success",
        description: "Video response has been generated and sent.",
      });
    } catch (error) {
      console.error('Failed to generate video:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate video response",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleGenerateVideo}
      disabled={isGenerating}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        isGenerating && "animate-pulse",
        className
      )}
    >
      <Video className="h-4 w-4" />
    </Button>
  );
} 