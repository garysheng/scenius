'use client';

import { useScenieChatHook } from '@/lib/hooks/use-scenie-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GradientBackground } from '@/components/ui/gradient-background';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { VectorSearchToolCall } from '@/types/vector-search';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ScenieChatProps {
  spaceId: string;
  userId: string;
  className?: string;
}

export function ScenieChat({ spaceId, userId, className }: ScenieChatProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    startVoiceChat,
    stopVoiceChat,
    isVoiceChatActive,
    clearMessages,
  } = useScenieChatHook({
    spaceId,
    userId,
    mode: 'text',
    onModeChange: (mode) => console.log('Mode changed:', mode),
  });

  console.log('User data in ScenieChat:', {
    avatarUrl: user?.avatarUrl,
    hasAvatar: !!user?.avatarUrl
  });

  // Scroll to position new messages at the top
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const messageElement = document.getElementById(lastMessage.id);
      
      if (messageElement) {
        // Get the scroll container's padding
        const scrollContainer = scrollAreaRef.current;
        const containerPadding = parseInt(getComputedStyle(scrollContainer).paddingTop);
        
        // Calculate position to show message at top of viewport
        const scrollPosition = messageElement.offsetTop - containerPadding;
        
        scrollAreaRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const messageToSend = trimmedInput; // Store the message
    setInputValue(''); // Clear input immediately

    try {
      await sendMessage(messageToSend); // Send the stored message
    } catch (err) {
      console.error('Error sending message:', err);
      setInputValue(messageToSend); // Restore the input if sending fails
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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

  const clearHistory = () => {
    clearMessages();
    setInputValue('');
  };

  return (
    <div className={cn('flex flex-col bg-background/80 relative', className)}>
      <GradientBackground />
      
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Chat with Scenie</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={clearHistory}
          title="Clear chat history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            message.content && (
              <div
                key={message.id}
                id={message.id}
                className={cn(
                  'flex flex-col gap-3 max-w-[80%]',
                  message.sender === 'user' ? 'ml-auto' : 'mr-auto'
                )}
              >
                <div className="flex gap-3">
                  {message.sender === 'scenie' && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/logo.png" alt="Scenie" className="object-cover" />
                      <AvatarFallback>S</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'rounded-lg p-3 prose prose-invert max-w-none',
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Override link rendering to open in new tab
                        a: ({ ...props }) => (
                          <a 
                            {...props} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-foreground underline"
                          />
                        ),
                        // Style code blocks
                        code: ({ ...props }) => (
                          <code 
                            {...props} 
                            className="bg-background/20 rounded px-1 py-0.5"
                          />
                        ),
                        // Style blockquotes
                        blockquote: ({ ...props }) => (
                          <blockquote 
                            {...props} 
                            className="border-l-4 border-primary/50 pl-4 italic"
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.sender === 'user' && (
                    <Avatar className="h-8 w-8">
                      {user?.avatarUrl ? (
                        <div className="relative w-full h-full">
                          <Image 
                            src={user.avatarUrl} 
                            alt="User"
                            fill
                            sizes="32px"
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          U
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
                {message.toolCalls?.map((toolCall: VectorSearchToolCall, index: number) => (
                  <div key={index} className="mt-2 space-y-2">
                    {toolCall.output && toolCall.output.map((result, i: number) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        <span className="font-medium">Score: {result.score.toFixed(2)}</span>
                        <p>{result.content}</p>
                      </div>
                    ))}
                    {toolCall.error && (
                      <p className="text-sm text-destructive">{toolCall.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/logo.png" alt="Scenie" className="object-cover" />
                <AvatarFallback>S</AvatarFallback>
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/95 backdrop-blur flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
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