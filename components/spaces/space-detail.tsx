'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  MessageSquare,
  ChevronDown,
  Plus,
  Hash,
  Volume2,
  Send,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SpaceFrontend, ChannelFrontend, MessageFrontend, UserFrontend } from '@/types';
import { spacesService } from '@/lib/services/client/spaces';
import { messagesService } from '@/lib/services/client/messages';
import { ChannelList } from '@/components/channels/channel-list';
import { CreateChannelDialog } from '@/components/channels/create-channel-dialog';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersService } from '@/lib/services/client/users';
import { MessageList } from '@/components/messages/message-list';
import { VoiceRecorder } from '@/components/messages/voice-recorder';
import { MemberList } from '@/components/spaces/member-list';
import { UserStatusMenu } from '@/components/user/user-status-menu';
import { SpaceActionMenu } from './space-action-menu';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SpaceDetailProps {
  id: string;
}

export function SpaceDetail({ id }: SpaceDetailProps) {
  const [space, setSpace] = useState<SpaceFrontend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelFrontend | null>(null);
  const [messages, setMessages] = useState<MessageFrontend[]>([]);
  const [users, setUsers] = useState<Record<string, UserFrontend>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Load and select first channel
  useEffect(() => {
    const loadFirstChannel = async () => {
      try {
        const channelsRef = collection(db, 'spaces', id, 'channels');
        const q = query(channelsRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const firstChannel = snapshot.docs[0].data() as ChannelFrontend;
          firstChannel.id = snapshot.docs[0].id;
          setSelectedChannel(firstChannel);
        }
      } catch (err) {
        console.error('Failed to load first channel:', err);
      }
    };

    if (space && !selectedChannel) {
      loadFirstChannel();
    }
  }, [id, space, selectedChannel]);

  // Subscribe to messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      const unsubscribe = messagesService.subscribeToMessages(
        id,
        selectedChannel.id,
        (newMessages) => setMessages(newMessages)
      );

      return () => unsubscribe();
    }
  }, [id, selectedChannel]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChannel || !user) return;

    try {
      setIsSending(true);
      await messagesService.sendMessage(id, selectedChannel.id, messageInput.trim(), user.id);
      setMessageInput('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Failed to send message:', err.message);
      } else {
        console.error('Failed to send message:', err);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/signin');
      return;
    }

    const loadSpace = async () => {
      try {
        const spaceData = await spacesService.getSpace(id);
        setSpace(spaceData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadSpace();
    }
  }, [id, isAuthenticated, authLoading, router]);

  // Load user data for messages
  useEffect(() => {
    const userIds = messages
      .map(m => m.userId)
      .filter((id, index, self) => self.indexOf(id) === index);

    const loadUsers = async () => {
      const userData: Record<string, UserFrontend> = {};
      
      await Promise.all(
        userIds.map(async (userId) => {
          if (!users[userId]) {
            try {
              const user = await usersService.getUser(userId);
              userData[userId] = user;
            } catch (err) {
              console.error(`Failed to load user ${userId}:`, err);
            }
          }
        })
      );

      setUsers(prev => ({ ...prev, ...userData }));
    };

    if (userIds.length > 0) {
      loadUsers();
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen cosmic-bg">
        <div className="flex h-screen">
          {/* Sidebar skeleton */}
          <div className="w-64 cosmic-card animate-pulse" />
          {/* Main content skeleton */}
          <div className="flex-1 cosmic-card animate-pulse ml-[1px]" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button
            onClick={() => router.push('/spaces')}
            variant="outline"
            className="mt-4"
          >
            Back to Spaces
          </Button>
        </div>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg">
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Sidebar skeleton */}
          <div className="w-64 cosmic-card animate-pulse" />
          {/* Main content skeleton */}
          <div className="flex-1 cosmic-card animate-pulse ml-[1px]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg">
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className="w-64 cosmic-card flex flex-col">
          {/* Space Header */}
          <div className="p-3 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              {space.avatarUrl ? (
                <img
                  src={space.avatarUrl}
                  alt={space.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                  <Users className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
              <h1 className="font-semibold text-sm truncate bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
                {space.name}
              </h1>
            </div>
            <SpaceActionMenu space={space} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {/* Channels Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                  <span>Channels</span>
                </div>
                <CreateChannelDialog 
                  spaceId={space.id}
                  onChannelCreated={() => router.refresh()}
                  trigger={
                    <Button variant="ghost" size="icon" className="w-4 h-4 p-0 text-foreground">
                      <Plus className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
              <ChannelList 
                spaceId={space.id} 
                selectedChannel={selectedChannel}
                onChannelSelect={setSelectedChannel}
              />
            </div>

            {/* Direct Messages Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                  <span>Direct Messages</span>
                </div>
                <Button variant="ghost" size="icon" className="w-4 h-4 p-0 text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground text-center py-4">
                Coming soon
              </div>
            </div>

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                  <span>Members</span>
                </div>
              </div>
              <MemberList spaceId={space.id} />
            </div>
          </nav>

          {/* User Status Menu */}
          <div className="border-t border-border/50">
            <UserStatusMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 cosmic-card ml-[1px] overflow-hidden flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="h-12 border-b border-border/50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{selectedChannel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Text
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Voice
                  </Button>
                </div>
              </div>

              {/* Channel Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <MessageList messages={messages} users={users} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border/50">
                <div className="relative">
                  <Textarea 
                    placeholder={`Message #${selectedChannel.name}`}
                    className="cosmic-input min-h-[80px] pr-32 resize-none"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-3">
                    <VoiceRecorder
                      onRecordingComplete={async (blob, transcription) => {
                        if (!user) {
                          console.error('User not found');
                          return;
                        }
                        try {
                          setIsSending(true);
                          await messagesService.sendVoiceMessage(
                            id,
                            selectedChannel.id,
                            blob,
                            user.id,
                            transcription
                          );
                        } catch (err: unknown) {
                          if (err instanceof Error) {
                            console.error('Failed to send voice message:', err.message);
                          } else {
                            console.error('Failed to send voice message:', err);
                          }
                        } finally {
                          setIsSending(false);
                        }
                      }}
                    />
                    <div className="h-6 w-[1px] bg-border/50" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isSending}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="text-primary-foreground bg-primary hover:bg-primary/90"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Welcome to {space.name}!</h2>
                <p className="text-muted-foreground">
                  {space.metadata.channelCount === 0 ? (
                    <>Create your first channel to get started!</>
                  ) : (
                    <>Select a channel to start chatting</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 