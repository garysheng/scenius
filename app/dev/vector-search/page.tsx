'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VectorSearchResult } from '@/types/vector-search';
import { SpaceFrontend } from '@/types/spaces';
import { useAuth } from '@/lib/hooks/use-auth';
import { getAuth } from 'firebase/auth';
import { spacesService } from '@/lib/services/client/spaces';
import { langsmithService } from '@/lib/services/client/langsmith';
import { useRouter } from 'next/navigation';

export default function VectorSearchPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [spaces, setSpaces] = useState<SpaceFrontend[]>([]);
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated after auth state is loaded
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // Only load spaces if authenticated
    if (user) {
      const loadSpaces = async () => {
        try {
          const userSpaces = await spacesService.getSpaces();
          setSpaces(userSpaces);
          if (userSpaces.length > 0) {
            setSpaceId(userSpaces[0].id);
          }
        } catch (err) {
          console.error('Error loading spaces:', err);
          setError('Failed to load spaces');
        }
      };

      loadSpaces();
    }
  }, [user, isLoading, router]);

  const handleSearch = async () => {
    if (!query || !spaceId) {
      setError('Please provide both a query and select a space');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      
      if (!token) {
        throw new Error('You must be signed in to perform a search');
      }

      const response = await fetch('/api/vector-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          spaceId,
          limit: 10
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform vector search');
      }

      const data = await response.json();
      setResults(data.results);

      // Track search in LangSmith
      await langsmithService.trackSearch(query, spaceId, data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth state is being determined
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Loading...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Vector Search Testing</CardTitle>
          <CardDescription>
            Test semantic search functionality across messages using vector embeddings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter search query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={spaceId} onValueChange={setSpaceId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.messageId}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-muted-foreground">
                        Score: {result.score.toFixed(4)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(result.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{result.content}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Channel: {result.channelId}
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View Message
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {results.length === 0 && !loading && !error && (
                <div className="text-center text-muted-foreground py-8">
                  No results found
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 