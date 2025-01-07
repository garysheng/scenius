'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ChevronDown,
  Plus,
  Hash,
  Bot,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageInput } from '@/components/messages/message-input';
import { SpaceFrontend, ChannelFrontend, MessageFrontend, UserFrontend, FileAttachment } from '@/types';
import { spacesService } from '@/lib/services/client/spaces';
import { messagesService } from '@/lib/services/client/messages';
import { ChannelList } from '@/components/channels/channel-list';
import { CreateChannelDialog } from '@/components/channels/create-channel-dialog';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersService } from '@/lib/services/client/users';
import { MessageList } from '@/components/messages/message-list';
import { MemberList } from '@/components/spaces/member-list';
import { UserStatusMenu } from '@/components/user/user-status-menu';
import { SpaceActionMenu } from './space-action-menu';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { channelsService } from '@/lib/services/client/channels';
import { cn } from '@/lib/utils';
import { ThreadView } from '@/components/messages/thread-view';
import { SceniePanel } from './scenie-panel';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { urlService } from '@/lib/services/client/url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SpaceDetailProps {
  id: string;
}

export function SpaceDetail({ id }: SpaceDetailProps) {
  const [space, setSpace] = useState<SpaceFrontend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelFrontend | null>(null);
  const [channelData, setChannelData] = useState<ChannelFrontend[]>([]);
  const [messages, setMessages] = useState<MessageFrontend[]>([]);
  const [users, setUsers] = useState<Record<string, UserFrontend>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isChannelsSectionExpanded, setIsChannelsSectionExpanded] = useState(true);
  const [isDMSectionExpanded, setIsDMSectionExpanded] = useState(true);
  const [activeThread, setActiveThread] = useState<{
    message: MessageFrontend;
    user: UserFrontend | null;
  } | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'scenie'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const getChannelDisplayName = useCallback((channel: ChannelFrontend) => {
    if (channel.kind === 'DM' && user) {
      const otherParticipant = channel.metadata.participants?.find(p => p.id !== user.id);
      return otherParticipant?.fullName || otherParticipant?.username || 'Unknown User';
    }
    return channel.name;
  }, [user]);

  // Load channels
  useEffect(() => {
    if (!space) return;

    const unsubscribe = channelsService.subscribeToChannels(space.id, (channels) => {
      setChannelData(channels);
    });

    return () => unsubscribe();
  }, [space]);

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

  const handleSendMessage = async (content: string, attachments?: FileAttachment[]) => {
    if (!user || !selectedChannel) return;
    await messagesService.sendMessage(id, selectedChannel.id, content, user.id, attachments);
  };

  const handleSendVoiceMessage = async (blob: Blob, transcription: string) => {
    if (!user || !selectedChannel) return;
    await messagesService.sendVoiceMessage(
      id,
      selectedChannel.id,
      blob,
      user.id,
      transcription
    );
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(urlService.auth.signIn());
      return;
    }

    const loadSpace = async () => {
      try {
        const spaceData = await spacesService.getSpace(id);
        setSpace(spaceData);
        setAccessDenied(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === 'You do not have access to this space') {
            setAccessDenied(true);
          }
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
      .filter((id, index, self) => self.indexOf(id) === index)
      .filter(id => !users[id]); // Only load users we don't have

    if (userIds.length === 0) return;

    const loadUsers = async () => {
      const userData: Record<string, UserFrontend> = {};

      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await usersService.getUser(userId);
            userData[userId] = user;
          } catch (err) {
            console.error(`Failed to load user ${userId}:`, err);
          }
        })
      );

      setUsers(prev => ({ ...prev, ...userData }));
    };

    loadUsers();
  }, [messages]); // Only depend on messages changes

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler for direct channel selection (used by ChannelList and MemberList)
  const handleDirectChannelSelect = (channel: ChannelFrontend) => {
    setSelectedChannel(channel);
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  // Handler for channel ID selection (used by MessageList)
  const handleChannelSelect = async (channelId: string) => {
    try {
      const channel = await channelsService.getChannel(id, channelId);
      setSelectedChannel(channel);
      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load channel:', error);
    }
  };

  const handleThreadOpen = useCallback((message: MessageFrontend) => {
    const messageUser = users[message.userId] || null;
    setActiveThread({
      message,
      user: messageUser
    });
  }, [users]);

  const handleThreadClose = useCallback(() => {
    setActiveThread(null);
  }, []);

  // Add effect to fetch user role
  useEffect(() => {
    if (!user || !space) return;

    const loadUserRole = async () => {
      const role = await spacesService.getMemberRole(id, user.id);
      setUserRole(role);
    };

    loadUserRole();
  }, [id, user, space]);

  // Handle URL parameters for deep linking
  useEffect(() => {
    if (!channelData || channelData.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const channelId = params.get('channel');
    const messageId = params.get('message');

    if (channelId) {
      const channel = channelData.find((c: ChannelFrontend) => c.id === channelId);
      if (channel) {
        setSelectedChannel(channel);

        // If there's a specific message to scroll to
        if (messageId) {
          // Add a small delay to ensure the messages are loaded
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add a highlight effect
              messageElement.classList.add('highlight-message');
              setTimeout(() => messageElement.classList.remove('highlight-message'), 3000);
            }
          }, 500);
        }
      }
    } else if (channelData.length > 0) {
      // If no channel specified, select the first one
      setSelectedChannel(channelData[0]);
    }
  }, [channelData]);

  // Add useEffect to handle initial mobile state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  if (accessDenied) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-destructive mb-4">You do not have permission to access this space.</p>
          <Button
            onClick={() => router.push(urlService.spaces.list())}
            variant="outline"
            className="mt-4"
          >
            Back to Spaces
          </Button>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button
            onClick={() => router.push(urlService.spaces.list())}
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
    <main className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--background-dark))] via-[hsl(var(--background))] to-[hsl(var(--background-light))]" />

      <div className="flex h-[calc(100vh-3.5rem)] relative z-10">
        {/* Mobile Sidebar Toggle */}
        <button
          className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-primary/80 hover:bg-primary text-white p-1 rounded-r-md"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform duration-200",
            isSidebarOpen && "rotate-180"
          )} />
        </button>

        {/* Sidebar */}
        <div className={cn(
          "w-64 relative group transition-transform duration-200 ease-in-out",
          "fixed md:relative h-full z-40",
          !isSidebarOpen && "-translate-x-full md:translate-x-0",
          // Only show border and glow on mobile when sidebar is open
          isSidebarOpen && [
            "md:border-r-0 md:shadow-none", // Remove on desktop
            "border-r border-white/50 shadow-[1px_0_10px_0_rgba(255,255,255,0.3)]" // Show on mobile
          ]
        )}>
          <div className="absolute -inset-[1px] bg-gradient-to-b from-[hsl(var(--ai-primary))/10] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
          <div className="cosmic-card h-full flex flex-col relative">
            {/* Space Header */}
            <div className="p-3 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2 max-w-[70%]">
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h1 className="font-semibold text-sm truncate text-foreground">
                        {space.name}
                      </h1>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{space.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <SpaceActionMenu space={space} />
                <button
                  className="md:hidden text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
              {/* Channels Section */}
              <div>
                <div
                  className="flex items-center justify-between w-full mb-2 group cursor-pointer"
                  onClick={() => setIsChannelsSectionExpanded(!isChannelsSectionExpanded)}
                >
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      !isChannelsSectionExpanded && "-rotate-90"
                    )} />
                    <span>Channels</span>
                  </div>
                  <CreateChannelDialog
                    spaceId={space.id}
                    onChannelCreated={() => router.refresh()}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    }
                  />
                </div>
                {isChannelsSectionExpanded && (
                  <ChannelList
                    spaceId={space.id}
                    selectedChannel={selectedChannel}
                    onChannelSelect={handleDirectChannelSelect}
                  />
                )}
              </div>

              {/* Direct Messages Section */}
              <div>
                <div
                  className="flex items-center justify-between w-full mb-2 group cursor-pointer"
                  onClick={() => setIsDMSectionExpanded(!isDMSectionExpanded)}
                >
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      !isDMSectionExpanded && "-rotate-90"
                    )} />
                    <span>Direct messages</span>
                  </div>
                </div>
                {isDMSectionExpanded && (
                  <MemberList
                    spaceId={id}
                    selectedChannel={selectedChannel}
                    onChannelSelect={handleDirectChannelSelect}
                  />
                )}
              </div>
            </nav>

            {/* User Status Menu */}
            <div className="border-t border-border/50">
              <UserStatusMenu />
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className={cn(
          "flex-1 relative group",
          "transition-[margin] duration-200 ease-in-out",
          isSidebarOpen ? "md:ml-[1px]" : "ml-0"
        )}>
          {selectedChannel ? (
            <div className="flex h-full overflow-hidden">
              {/* Main Channel Content */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Channel Header */}
                <div className="h-12 shrink-0 border-b border-border/50 flex items-center px-4 gap-4">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors",
                      activeTab === 'chat' ? "bg-primary/60 text-white" : "hover:bg-primary/30"
                    )}
                    onClick={() => setActiveTab('chat')}
                  >
                    <Hash className="w-4 h-4" />
                    <span className="font-medium">{getChannelDisplayName(selectedChannel)}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors",
                      activeTab === 'scenie' ? "bg-primary/60 text-white" : "hover:bg-primary/30"
                    )}
                    onClick={() => setActiveTab('scenie')}
                  >
                    <Bot className="w-4 h-4" />
                    <span className="font-medium">Scenie</span>
                  </div>
                </div>

                {/* Channel Content */}
                <div className="flex-1 flex flex-col min-h-0">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'scenie')} className="flex-1 flex flex-col min-h-0">
                    <TabsContent value="chat" className="grow data-[state=active]:flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto">
                        <MessageList
                          messages={messages}
                          users={users}
                          spaceId={id}
                          onChannelSelect={handleChannelSelect}
                          onThreadOpen={handleThreadOpen}
                          isThread={false}
                          spaceRole={userRole || undefined}
                        />
                      </div>
                      {/* Chat Input */}
                      <div className="shrink-0 p-4 border-t border-border/50">
                        <MessageInput
                          placeholder={
                            selectedChannel.kind === 'DM'
                              ? `Message ${getChannelDisplayName(selectedChannel)}`
                              : `Message #${selectedChannel.name}`
                          }
                          onSendMessage={handleSendMessage}
                          onSendVoiceMessage={handleSendVoiceMessage}
                          spaceId={id}
                          channelId={selectedChannel.id}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="scenie" className="grow data-[state=active]:flex min-h-0">
                      <SceniePanel
                        spaceId={id}
                        channelId={selectedChannel.id}
                        messages={messages}
                        channelName={selectedChannel.name}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Thread View */}
              {activeThread && (
                <ThreadView
                  spaceId={id}
                  channelId={selectedChannel.id}
                  parentMessage={activeThread.message}
                  parentUser={activeThread.user}
                  onClose={handleThreadClose}
                  spaceRole={userRole || undefined}
                />
              )}
            </div>
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