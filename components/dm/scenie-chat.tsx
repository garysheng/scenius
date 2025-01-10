'use client';

import { useScenieChatHook } from '@/lib/hooks/use-scenie-chat';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ScenieChatProps {
  spaceId: string;
  userId: string;
  className?: string;
}

export function ScenieChat({ spaceId, userId, className }: ScenieChatProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
  } = useScenieChatHook({
    spaceId,
    userId,
    mode: 'text',
    onModeChange: (mode) => console.log('Mode changed:', mode),
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    try {
      await sendMessage(trimmedInput);
      setInputValue('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const toggleVoiceChat = async () => {
    try {
      if (isVoiceChatActive) {
        await stopVoiceChat();
      } else {
        await startVoiceChat();
      }
    } catch (err) {
      console.error('Error toggling voice chat:', err);
    }
  };

  return (
    <div className={cn('flex flex-col bg-background', className)}>
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            message.content && (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 max-w-[80%]',
                  message.sender === 'user' ? 'ml-auto' : 'mr-auto'
                )}
              >
                {message.sender === 'scenie' && (
                  <Avatar className="h-8 w-8">
                    <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-sm">
                      S
                    </div>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'rounded-lg p-3',
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.content}
                </div>
                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <div className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground text-sm">
                      U
                    </div>
                  </Avatar>
                )}
              </div>
            )
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-sm">
                  S
                </div>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive">
              Error: {error.message}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Message Scenie..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleVoiceChat}
        >
          {isVoiceChatActive ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 