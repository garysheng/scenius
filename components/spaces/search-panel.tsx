'use client';

import { useState, useEffect } from 'react';
import { Search, Hash, MessageSquare, File } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchService, SearchResult } from '@/lib/services/client/search';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SearchPanelProps {
  spaceId: string;
  onClose: () => void;
}

export function SearchPanel({ spaceId, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchDebounced = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await searchService.search(spaceId, query);
        console.log('Search results:', searchResults);
        console.log('Message results:', searchResults.filter(r => r.type === 'message'));
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [query, spaceId]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'message' || result.type === 'channel') {
      router.push(result.url);
    } else if (result.type === 'file') {
      window.open(result.url, '_blank');
    }
    onClose();
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'channel':
        return <Hash className="w-4 h-4 text-muted-foreground" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
      case 'file':
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getResultTitle = (result: SearchResult) => {
    switch (result.type) {
      case 'channel':
        return `#${result.title}`;
      case 'message':
        return `Message in #${result.channelId}`;
      case 'file':
        return result.title;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
        <div className="bg-card rounded-lg shadow-lg border border-border">
          {/* Search Input */}
          <div className="p-4 border-b border-border flex gap-2 items-center">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages, channels, and files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 bg-transparent"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md hover:bg-accent",
                        "flex items-start gap-3 group relative"
                      )}
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {getResultTitle(result)}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(result.timestamp, 'MMM d, yyyy')}
                          </span>
                        </div>
                        {result.snippet && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.snippet}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="p-4 text-center text-muted-foreground">
                  No results found
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
} 