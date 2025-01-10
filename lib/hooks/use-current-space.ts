import { useEffect, useState } from 'react';
import { SpaceFrontend } from '@/types';

export function useCurrentSpace(spaceId: string) {
  const [space, setSpace] = useState<SpaceFrontend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpace() {
      if (!spaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/spaces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ spaceId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch space');
        }
        const data = await response.json();
        setSpace(data);
      } catch (err) {
        console.error('Error fetching space:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch space');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSpace();
  }, [spaceId]);

  return { space, isLoading, error };
} 