'use client';

import { useState, useCallback } from 'react';
import { 
  Settings,
  MoreVertical,
  LogOut,
  Search,
  MessageSquare,
  File,
  Hash,
  Calendar,
  Volume2,
  Loader2,
  Sparkles,
  Cog,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpaceFrontend } from '@/types';
import { ChatSummary, VoiceDictation } from '@/types/scenie';
import { useAuth } from '@/lib/hooks/use-auth';
import { spacesService } from '@/lib/services/client/spaces';
import { searchService, SearchResult } from '@/lib/services/client/search';
import { scenieService } from '@/lib/services/client/scenie';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import debounce from 'lodash/debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface SpaceActionMenuProps {
  space: SpaceFrontend;
}

export function SpaceActionMenu({ space }: SpaceActionMenuProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [voiceDictation, setVoiceDictation] = useState<VoiceDictation | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchService.search(space.id, query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [space.id]
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'file':
        return <File className="w-4 h-4" />;
      case 'channel':
        return <Hash className="w-4 h-4" />;
    }
  };

  const handleLeaveSpace = async () => {
    if (!user) return;
    
    try {
      setIsLeaving(true);
      setLeaveError(null);
      
      await spacesService.leaveSpace(space.id, user.id);
      
      setIsOpen(false);
      router.refresh();
      router.push('/spaces');
    } catch (error) {
      console.error('Failed to leave space:', error);
      setLeaveError(error instanceof Error ? error.message : 'Failed to leave space');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user) return;
    
    setIsGeneratingSummary(true);
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const summary = await scenieService.generateChannelSummary(space.id, 'all', startTime, endTime);
      setSummary(summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!user) return;
    
    setIsGeneratingVoice(true);
    try {
      const dictation = await scenieService.generateSpaceVoiceDictation(space.id);
      setVoiceDictation(dictation);
    } catch (error) {
      console.error('Failed to generate voice dictation:', error);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <MoreVertical className="w-4 h-4" />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Space Actions</DialogTitle>
          <DialogDescription>
            Manage your space settings and actions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="scenie" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Scenie
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 pt-8">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search messages, files, and more..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>

              <ScrollArea className="max-h-[400px]">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No results found</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {searchResults.map((result) => (
                      <Link 
                        key={result.id} 
                        href={result.url}
                        className="block p-3 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-muted-foreground">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">
                              {result.title}
                            </h4>
                            {result.snippet && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {result.snippet}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {result.timestamp.toLocaleDateString()} • {result.type}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="scenie" className="space-y-4 pt-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Space Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      Get a summary of all activity across the space
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Voice Dictation</h4>
                    <p className="text-sm text-muted-foreground">
                      Convert space activity into voice narration
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleGenerateVoice}
                    disabled={isGeneratingVoice}
                  >
                    {isGeneratingVoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    {isGeneratingVoice ? 'Generating...' : 'Generate Voice'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-4 p-2">
                  {!summary && !voiceDictation ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Select an action above to get started
                    </div>
                  ) : (
                    <>
                      {summary && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Summary for {format(summary.startTime.toDate(), 'MMM d, yyyy')}
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-2">
                            <p>{summary.summary}</p>
                            {summary.topics.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {summary.topics.map((topic: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {voiceDictation && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Volume2 className="w-4 h-4" />
                            Voice Dictation
                          </h4>
                          {voiceDictation.audioUrl && (
                            <audio 
                              controls 
                              src={voiceDictation.audioUrl} 
                              className="w-full"
                            />
                          )}
                          <p className="text-sm text-muted-foreground">
                            {voiceDictation.content}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 pt-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Space Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure your space settings
                  </p>
                </div>
                <Link href={`/spaces/${space.id}/settings`}>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Leave Space</h4>
                  <p className="text-sm text-muted-foreground">
                    Leave this space permanently
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleLeaveSpace}
                  disabled={isLeaving || space.ownerId === user?.id}
                >
                  {isLeaving ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2"></span>
                      Leaving...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Space
                    </>
                  )}
                </Button>
              </div>
              {leaveError && (
                <p className="text-sm text-destructive mt-2">{leaveError}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 