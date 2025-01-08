'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpaceCard } from '@/components/spaces/space-card';
import { SpaceFrontend } from '@/types';
import { useRouter } from 'next/navigation';
import { spacesService } from '@/lib/services/client/spaces';
import { useAuth } from '@/lib/hooks/use-auth';
import { urlService } from '@/lib/services/client/url';
import { LoadingStars } from '@/components/ui/loading-stars';

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<SpaceFrontend[]>([]);
  const [publicSpaces, setPublicSpaces] = useState<SpaceFrontend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const [userSpaces, recentSpaces] = await Promise.all([
          spacesService.getSpaces(),
          spacesService.getRecentSpaces()
        ]);
        setSpaces(userSpaces);
        setPublicSpaces(recentSpaces);
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

    if (!authLoading) {
      if (!isAuthenticated) {
        router.push(urlService.auth.signIn());
      } else {
        loadSpaces();
      }
    }
  }, [isAuthenticated, authLoading, router]);

  const handleCreateSpace = () => {
    router.push('/spaces/create');
  };

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen cosmic-bg">
        <div className="flex h-screen items-center justify-center">
          <LoadingStars size="lg" text="Loading spaces..." />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen cosmic-bg p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-white font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
                Your Spaces
              </h1>
              <p className="text-muted-foreground mt-1">
                Communities you own or are a member of
              </p>
            </div>
            <Button
              onClick={handleCreateSpace}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 glow-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Space
            </Button>
          </div>

          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {spaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t joined any spaces yet. Create one to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
              Recently Created Spaces
            </h1>
            <p className="text-muted-foreground mt-1">
              Communities that you may be able to join
            </p>
          </div>

          {publicSpaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No public spaces available at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {publicSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
} 