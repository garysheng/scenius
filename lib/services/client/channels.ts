import { 
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Channel, ChannelFrontend } from '@/types';
import { usersService } from './users';

export const channelsService = {
  async createChannel(spaceId: string, data: Omit<Channel, 'id' | 'spaceId' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<string> {
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const docRef = await addDoc(channelsRef, {
      ...data,
      spaceId,
      kind: 'CHANNEL',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        messageCount: 0,
        lastMessageAt: null
      }
    });
    return docRef.id;
  },

  async createDM(spaceId: string, participantIds: string[]): Promise<string> {
    // Check if DM already exists between these users
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const dmQuery = query(
      channelsRef,
      where('kind', '==', 'DM'),
      where('metadata.participantIds', '==', participantIds.sort())
    );
    
    const existingDMs = await getDocs(dmQuery);
    if (!existingDMs.empty) {
      return existingDMs.docs[0].id;
    }

    // Create new DM channel
    const now = Timestamp.now();
    const docRef = await addDoc(channelsRef, {
      name: 'Direct Message',
      description: '',
      kind: 'DM',
      spaceId,
      createdAt: now,
      updatedAt: now,
      metadata: {
        messageCount: 0,
        lastMessageAt: null,
        participantIds: participantIds.sort() // Sort to ensure consistent order
      }
    });

    return docRef.id;
  },

  async getChannels(spaceId: string): Promise<ChannelFrontend[]> {
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const channelsQuery = query(channelsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(channelsQuery);

    const defaultMetadata = {
      messageCount: 0,
      lastMessageAt: null,
      participants: []
    };

    const channels = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const channel: ChannelFrontend = {
        id: doc.id,
        spaceId: data.spaceId || spaceId,
        name: data.name || 'Unnamed Channel',
        description: data.description || '',
        kind: data.kind || 'CHANNEL',
        permissions: data.permissions || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        metadata: {
          ...defaultMetadata,
          ...(data.metadata || {}),
          lastMessageAt: data.metadata?.lastMessageAt ? 
            (data.metadata.lastMessageAt as Timestamp)?.toDate() : 
            null
        }
      };

      // If it's a DM channel, fetch participant details
      if (data.kind === 'DM' && data.metadata?.participantIds?.length) {
        try {
          const participants = await Promise.all(
            data.metadata.participantIds.map((id: string) => usersService.getUser(id))
          );
          channel.metadata.participants = participants;
        } catch (error) {
          console.error('Failed to fetch DM participants:', error);
          channel.metadata.participants = [];
        }
      }

      return channel;
    }));

    return channels;
  },

  async getChannel(spaceId: string, channelId: string): Promise<ChannelFrontend> {
    const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);

    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const data = channelDoc.data();
    const defaultMetadata = {
      messageCount: 0,
      lastMessageAt: null,
      participants: []
    };

    const channel: ChannelFrontend = {
      id: channelDoc.id,
      spaceId: data.spaceId || spaceId,
      name: data.name || 'Unnamed Channel',
      description: data.description || '',
      kind: data.kind || 'CHANNEL',
      permissions: data.permissions || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      metadata: {
        ...defaultMetadata,
        ...(data.metadata || {}),
        lastMessageAt: data.metadata?.lastMessageAt ? 
          (data.metadata.lastMessageAt as Timestamp)?.toDate() : 
          null
      }
    };

    // If it's a DM channel, fetch participant details
    if (data.kind === 'DM' && data.metadata?.participantIds?.length) {
      try {
        const participants = await Promise.all(
          data.metadata.participantIds.map((id: string) => usersService.getUser(id))
        );
        channel.metadata.participants = participants;
      } catch (error) {
        console.error('Failed to fetch DM participants:', error);
        channel.metadata.participants = [];
      }
    }

    return channel;
  },

  subscribeToChannels(spaceId: string, callback: (channels: ChannelFrontend[]) => void) {
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const channelsQuery = query(channelsRef, orderBy('name', 'asc'));

    return onSnapshot(channelsQuery, async (snapshot) => {
      const defaultMetadata = {
        messageCount: 0,
        lastMessageAt: null,
        participants: []
      };

      const channels = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const channel: ChannelFrontend = {
          id: doc.id,
          spaceId: data.spaceId || spaceId,
          name: data.name || 'Unnamed Channel',
          description: data.description || '',
          kind: data.kind || 'CHANNEL',
          permissions: data.permissions || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          metadata: {
            ...defaultMetadata,
            ...(data.metadata || {}),
            lastMessageAt: data.metadata?.lastMessageAt ? 
              (data.metadata.lastMessageAt as Timestamp)?.toDate() : 
              null
          }
        };

        // If it's a DM channel, fetch participant details
        if (data.kind === 'DM' && data.metadata?.participantIds?.length) {
          try {
            const participants = await Promise.all(
              data.metadata.participantIds.map((id: string) => usersService.getUser(id))
            );
            channel.metadata.participants = participants;
          } catch (error) {
            console.error('Failed to fetch DM participants:', error);
            channel.metadata.participants = [];
          }
        }

        return channel;
      }));

      callback(channels);
    });
  },
}; 