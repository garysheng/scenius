'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from './voice-recorder';
import { useAuth } from '@/lib/hooks/use-auth';
import { filesService } from '@/lib/services/client/files';
import { FileAttachment, MessageFrontend } from '@/types';
import { EmojiPicker } from './emoji-picker';
import { Portal } from '@/components/ui/portal';
import { VideoReplyButton } from './video-reply-button';

interface MessageInputProps {
  placeholder?: string;
  onSendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  onSendVoiceMessage?: (blob: Blob, transcription: string) => Promise<void>;
  className?: string;
  spaceId: string;
  channelId: string;
  messages: MessageFrontend[];
}

export function MessageInput({ 
  placeholder = 'Type a message...', 
  onSendMessage,
  onSendVoiceMessage,
  className,
  spaceId,
  channelId,
  messages
}: MessageInputProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<(FileAttachment & { progress?: number })[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      const pickerWidth = 352; // Default width of emoji-mart picker
      setPickerPosition({
        top: rect.top - 450, // Height of picker + some padding
        left: rect.left - (pickerWidth) // Center align with button
      });
    }
  }, [showEmojiPicker]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSend = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(
        messageInput.trim(),
        attachments.filter(a => a.uploadStatus === 'complete')
      );
      setMessageInput('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        const attachment: FileAttachment = {
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: '',
          uploadStatus: 'uploading',
          uploadProgress: 0
        };

        setAttachments(prev => [...prev, attachment]);

        const uploadedAttachment = await filesService.uploadFile(
          file,
          spaceId,
          channelId,
          (progress) => {
            setAttachments(prev => 
              prev.map(a => 
                a.id === attachment.id 
                  ? { ...a, uploadProgress: progress } 
                  : a
              )
            );
          }
        );

        setAttachments(prev => 
          prev.map(a => 
            a.id === attachment.id 
              ? { ...uploadedAttachment, uploadStatus: 'complete' } 
              : a
          )
        );
      } catch (error) {
        console.error('Failed to upload file:', error);
        // Show error toast
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoMessageSend = () => {
    // Implement video message sending logic here
    console.log('Video message sending logic');
    setMessageInput('');
  };

  return (
    <div className={className}>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 bg-[hsl(var(--muted))] rounded-md p-2"
            >
              <span className="text-sm truncate max-w-[200px]">
                {attachment.fileName}
              </span>
              {attachment.uploadStatus === 'uploading' && (
                <div className="h-1 w-20 bg-[hsl(var(--muted-foreground))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${attachment.uploadProgress}%` }}
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelect}
      />
      
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[hsl(var(--ai-primary))] via-[hsl(var(--accent-nebula))] to-[hsl(var(--ai-secondary))] rounded-md opacity-20 blur-sm group-hover:opacity-30 transition duration-500 animate-gradient-x" />
        <Textarea 
          placeholder={placeholder}
          className="cosmic-input min-h-[80px] pr-32 resize-none relative ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] transition-all duration-300"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-3">
          {onSendVoiceMessage && (
            <>
              <VoiceRecorder
                onRecordingComplete={async (blob, transcription) => {
                  if (!user) return;
                  try {
                    setIsSending(true);
                    await onSendVoiceMessage(blob, transcription);
                  } catch (error) {
                    console.error('Failed to send voice message:', error);
                  } finally {
                    setIsSending(false);
                  }
                }}
              />
              <div className="h-6 w-[1px] bg-border/50" />
            </>
          )}
          <VideoReplyButton
            spaceId={spaceId}
            channelId={channelId}
            messages={messages}
            transcript={messageInput}
            onMessageSent={()=>handleVideoMessageSend()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5" />
          </Button>
          <Button
            ref={emojiButtonRef}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(!showEmojiPicker);
            }}
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            className="text-primary-foreground bg-primary hover:bg-primary/90"
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showEmojiPicker && (
        <Portal>
          <div 
            className="fixed"
            style={{
              top: `${pickerPosition.top}px`,
              left: `${pickerPosition.left}px`,
              zIndex: 9999
            }}
          >
            <div className="bg-[hsl(var(--background))] rounded-lg shadow-lg border border-border">
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
              />
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
} 