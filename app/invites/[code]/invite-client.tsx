'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { accessControlService } from '@/lib/services/client/access-control';
import { spacesService } from '@/lib/services/client/spaces';
import { urlService } from '@/lib/services/client/url';

interface InviteClientProps {
  code: string;
}

export function InviteClient({ code }: InviteClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState<string>('');
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const verifyInvite = async () => {
      try {
        setIsLoading(true);
        // Verify the invite code and get space details
        const invite = await accessControlService.verifyInviteLink(code);
        
        if (!invite) {
          setError('This invite link is invalid or has expired');
          return;
        }

        // Get space details
        const space = await spacesService.getSpace(invite.spaceId);
        setSpaceName(space.name);

        // If user is authenticated, join the space
        if (isAuthenticated) {
          await spacesService.joinSpace(invite.spaceId, invite.assignedRole as 'owner' | 'admin' | 'member');
          router.push(urlService.spaces.detail(invite.spaceId));
        }
      } catch (err) {
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
      verifyInvite();
    }
  }, [code, isAuthenticated, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Verifying invite...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen cosmic-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Invalid Invite</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => router.push(urlService.spaces.list())}
              className="text-primary hover:text-primary/90 transition-colors"
            >
              Back to Spaces
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    const currentInviteUrl = urlService.invites.invite(code);
    return (
      <main className="min-h-screen cosmic-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
              Join {spaceName}
            </h1>
            <p className="text-muted-foreground">
              Sign in or create an account to join this space
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push(urlService.auth.signIn(currentInviteUrl))}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push(urlService.auth.signUp(currentInviteUrl))}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null; // Will redirect in useEffect when authenticated
} 