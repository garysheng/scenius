'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Send } from 'lucide-react';
import { useScenieChatHook } from '@/lib/hooks/use-scenie-chat';
import { cn } from '@/lib/utils';

interface ScenieChatProps {
  spaceId: string;
  channelId?: string;
  userId?: string;
}

const WELCOME_MESSAGE = {
  id: 'welcome',
  content: "👋 Hi! I'm Scenie, your Space Assistant. I can help you with:\n\n" +
    "• Getting information about channels and their content\n" +
    "• Learning about Space members and their activities\n" +
    "• Answering questions about any topic\n\n" +
    "You can type your message or use the microphone button for voice chat. How can I help you today?",
  timestamp: new Date(),
  sender: 'scenie' as const,
  mode: 'text' as const,
};

export function ScenieChat({ spaceId, channelId, userId }: ScenieChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    messages: chatMessages,
    isLoading,
    error,
    sendMessage,
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
  } = useScenieChatHook({
    spaceId,
    channelId,
    userId,
    mode: 'text',
  });

  // Combine welcome message with chat messages
  const messages = chatMessages.length === 0 ? [WELCOME_MESSAGE] : chatMessages;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim()) return;
    
    await sendMessage(inputRef.current.value);
    inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">S</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Scenie</h2>
            <p className="text-sm text-muted-foreground">Space Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start space-x-2.5',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender === 'scenie' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-medium text-primary">S</span>
                </div>
              )}
              <Card
                className={cn(
                  'max-w-[80%] p-4',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </Card>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-medium text-primary-foreground">U</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-medium text-primary">S</span>
              </div>
              <Card className="max-w-[80%] p-4 bg-muted">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {error && (
          <div className="mb-2 text-sm text-destructive">
            Error: {error.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            placeholder="Message Scenie..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={isVoiceChatActive ? stopVoiceChat : startVoiceChat}
            className="flex-shrink-0"
          >
            {isVoiceChatActive ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button type="submit" size="icon" disabled={isLoading} className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
} 