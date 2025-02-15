'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { spacesService } from '@/lib/services/client/spaces';
import { useAuth } from '@/lib/hooks/use-auth';
import { urlService } from '@/lib/services/client/url';

interface JoinSpaceClientProps {
  id: string;
}

export function JoinSpaceClient({ id }: JoinSpaceClientProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save the space ID in sessionStorage to redirect after signup
      sessionStorage.setItem('pendingSpaceJoin', id);
      router.push(urlService.auth.signUp());
    }
  }, [isLoading, isAuthenticated, id, router]);

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      await spacesService.joinSpace(id);
      router.push(urlService.spaces.detail(id));
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
      setIsJoining(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
        <div className="max-w-md mx-auto mt-8 cosmic-card p-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted mt-4 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
      <div className="max-w-md mx-auto mt-8">
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--accent-nebula))] to-[hsl(var(--accent-aurora))] rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000" />
          <div className="relative cosmic-card p-8 text-center">
            <h1 className="text-2xl font-semibold text-[hsl(var(--text-primary))]">
              Join Space
            </h1>
            <p className="mt-2 text-[hsl(var(--text-secondary))]">
              You&apos;ve been invited to join this space
            </p>

            {error ? (
              <div className="mt-4 p-3 bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))] rounded-md">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full"
              >
                {isJoining ? 'Joining...' : 'Join Space'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(urlService.spaces.list())}
                disabled={isJoining}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 