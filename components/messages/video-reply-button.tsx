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
    if (!user) {
      console.log('No user found, aborting video generation');
      return;
    }

    if (!spaceId || !channelId) {
      console.log('Missing spaceId or channelId', { spaceId, channelId });
      return;
    }
    
    try {
      setIsGenerating(true);
      const latestMessage = messages[messages.length - 1];
      
      // Use transcript if available (even if empty), otherwise use latest message
      const content = transcript !== undefined ? transcript : latestMessage?.content;

      if (!content) {
        console.log('No content available for video generation');
        toast({
          title: "Error",
          description: "Please enter a message or select a message to respond to",
          variant: "destructive",
        });
        return;
      }

      // Only show toast if we're actually going to make the request
      toast({
        title: "Generating Video Response",
        description: "Your video response is being generated. This may take a few minutes.",
      });

      console.log('Sending request to /api/video-generate:', { content });

      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, isSenderGary: user.id === process.env.NEXT_PUBLIC_GARY_ID }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video reply');
      }

      if (!data.video_url) {
        throw new Error('No video URL returned from generation');
      }

      console.log('Video reply generated successfully:', {
        videoUrl: data.video_url,
        hasVideo: !!data.video_url
      });

      // Create video attachment
      const videoAttachment = {
        id: crypto.randomUUID(),
        fileUrl: data.video_url,
        fileName: 'Video Response',
        fileSize: 0,
        mimeType: 'video/mp4',
        thumbnailUrl: '',
        uploadStatus: 'complete' as const,
        uploadProgress: 100
      };

      // Send message with video attachment
      await messagesService.sendMessage(
        spaceId,
        channelId,
        content,
        user.id,
        [videoAttachment],
        'VIDEO'
      );

      toast({
        title: "Video Response Sent",
        description: "Your video response has been generated and sent.",
      });

      if (onMessageSent) {
        onMessageSent();
      }

    } catch (error) {
      console.error('Error generating video reply:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate video reply",
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