'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { accessControlService } from '@/lib/services/client/access-control';
import { spacesService } from '@/lib/services/client/spaces';
import { urlService } from '@/lib/services/client/url';
import { useToast } from '@/hooks/use-toast';
import { LoadingStars } from '@/components/ui/loading-stars';

interface InviteClientProps {
  code: string;
}

export function InviteClient({ code }: InviteClientProps) {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const verifyInvite = async () => {
      try {
        setIsLoading(true);
        
        // Verify the invite code
        const invite = await accessControlService.verifyInviteLink(code);
        if (!invite) {
          toast({
            title: "Invalid Invite",
            description: "This invite link is invalid or has expired.",
            variant: "destructive"
          });
          router.push('/');
          return;
        }

        // Join the space
        const welcomeData = await spacesService.joinSpace(invite.spaceId, invite.assignedRole as 'owner' | 'admin' | 'member');
        
        // Show welcome toast
        toast({
          title: `Welcome to ${welcomeData.name}! 🎉`,
          description: (
            <div className="mt-2 space-y-2">
              <p>{welcomeData.description}</p>
              <p className="text-sm text-muted-foreground">{welcomeData.workspaceRecap}</p>
            </div>
          )
        });

        // Redirect to the space
        router.push(urlService.spaces.detail(invite.spaceId));
      } catch (error) {
        console.error('Error verifying invite:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to join space",
          variant: "destructive"
        });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      verifyInvite();
    }
  }, [code, router, authLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingStars size="lg" text="Verifying invite..." />
      </div>
    );
  }

  return null;
} 