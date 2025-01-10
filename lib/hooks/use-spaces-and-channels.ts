import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';

interface Space {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  name: string;
  spaceId: string;
}

export function useSpacesAndChannels() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch spaces
        const spacesRef = collection(db, 'spaces');
        const spacesSnapshot = await getDocs(spacesRef);
        const spacesData = spacesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setSpaces(spacesData);

        // Fetch channels for all spaces
        const channelsData: Channel[] = [];
        for (const space of spacesData) {
          const channelsRef = collection(db, 'spaces', space.id, 'channels');
          const channelsSnapshot = await getDocs(channelsRef);
          channelsSnapshot.docs.forEach(doc => {
            channelsData.push({
              id: doc.id,
              name: doc.data().name,
              spaceId: space.id
            });
          });
        }
        setChannels(channelsData);
      } catch (err) {
        console.error('Error fetching spaces and channels:', err);
        setError('Failed to load spaces and channels');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const getChannelsForSpace = (spaceId: string) => {
    return channels.filter(channel => channel.spaceId === spaceId);
  };

  return {
    spaces,
    channels,
    getChannelsForSpace,
    loading,
    error
  };
} 