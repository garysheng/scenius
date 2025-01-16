import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import { SpaceFrontend, ChannelFrontend } from '@/types';

export function useSpacesAndChannels() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<SpaceFrontend[]>([]);
  const [channels, setChannels] = useState<ChannelFrontend[]>([]);
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
          name: doc.data().name,
          description: doc.data().description,
          avatarUrl: doc.data().avatarUrl,
          ownerId: doc.data().ownerId,
          settings: doc.data().settings,
          metadata: doc.data().metadata,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        }));
        setSpaces(spacesData);

        // Fetch channels for all spaces
        const channelsData: ChannelFrontend[] = [];
        for (const space of spacesData) {
          const channelsRef = collection(db, 'spaces', space.id, 'channels');
          const channelsSnapshot = await getDocs(channelsRef);
          
          for (const doc of channelsSnapshot.docs) {
            const data = doc.data();
            const channel: ChannelFrontend = {
              id: doc.id,
              name: data.name,
              description: data.description || '',
              spaceId: space.id,
              kind: data.kind || 'CHANNEL',
              permissions: data.permissions || [],
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              metadata: {
                messageCount: data.metadata?.messageCount || 0,
                lastMessageAt: data.metadata?.lastMessageAt?.toDate() || null,
                lastMessageSenderId: data.metadata?.lastMessageSenderId,
                participantIds: data.metadata?.participantIds || [],
                participants: []
              }
            };

            // If it's a DM, fetch participant details
            if (channel.kind === 'DM' && channel.metadata.participantIds?.length) {
              const participantsData = [];
              for (const participantId of channel.metadata.participantIds) {
                const userDoc = await getDocs(collection(db, 'users')).then(
                  snapshot => snapshot.docs.find(doc => doc.id === participantId)
                );
                if (userDoc) {
                  const userData = userDoc.data();
                  participantsData.push({
                    id: userDoc.id,
                    email: userData.email,
                    username: userData.username,
                    fullName: userData.fullName,
                    avatarUrl: userData.avatarUrl,
                    status: userData.status,
                    preferences: userData.preferences,
                    lastSeen: userData.lastSeen?.toDate() || new Date(),
                    createdAt: userData.createdAt?.toDate() || new Date(),
                    updatedAt: userData.updatedAt?.toDate() || new Date()
                  });
                }
              }
              channel.metadata.participants = participantsData;
            }

            channelsData.push(channel);
          }
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