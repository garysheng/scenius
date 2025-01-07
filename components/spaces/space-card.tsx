'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { SpaceFrontend } from '@/types';
import { Users } from 'lucide-react';
import { urlService } from '@/lib/services/client/url';

interface SpaceCardProps {
  space: SpaceFrontend;
}

export function SpaceCard({ space }: SpaceCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(urlService.spaces.detail(space.id));
  };

  return (
    <div className="cursor-pointer" onClick={handleClick}>
      <Card className="relative bg-[hsl(var(--elevation-1))] h-full rounded-lg p-6 ring-1 ring-[hsl(var(--border-dim))] hover:ring-[hsl(var(--border-glow))] hover:bg-[hsl(var(--elevation-2))] transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[hsl(var(--text-primary))]">
              {space.name}
            </h3>
            <p className="text-sm text-[hsl(var(--text-secondary))] line-clamp-2">
              {space.description}
            </p>
          </div>
          {space.avatarUrl ? (
            <img
              src={space.avatarUrl}
              alt={space.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
              <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{space.metadata.memberCount} members</span>
          </div>
          <div>
            {space.metadata.channelCount} channel{space.metadata.channelCount !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>
    </div>
  );
} 