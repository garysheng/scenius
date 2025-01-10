'use client';

import { useParams } from 'next/navigation';
import { useCurrentSpace } from '@/lib/hooks/use-current-space';
import { useAuth } from '@/lib/hooks/use-auth';
import { ScenieChat } from '@/components/dm/scenie-chat';
import { LoadingStars } from '@/components/ui/loading-stars';

export default function ScenieDMPage() {
  const params = useParams();
  const spaceId = params?.spaceId as string;
  const { user, isLoading: authLoading } = useAuth();
  const { space, isLoading: spaceLoading } = useCurrentSpace(spaceId);

  if (authLoading || spaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingStars />
      </div>
    );
  }

  if (!user || !space) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ScenieChat 
        spaceId={space.id} 
        userId={user.id} 
        className="flex-1"
      />
    </div>
  );
} 