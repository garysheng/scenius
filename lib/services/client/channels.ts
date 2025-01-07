import { 
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Channel, ChannelFrontend } from '@/types';

export const channelsService = {
  async createChannel(spaceId: string, data: Omit<Channel, 'id' | 'spaceId' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<string> {
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const docRef = await addDoc(channelsRef, {
      ...data,
      spaceId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        messageCount: 0,
        lastMessageAt: null
      }
    });
    return docRef.id;
  },

  async getChannels(spaceId: string): Promise<ChannelFrontend[]> {
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    const channelsQuery = query(channelsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(channelsQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
      metadata: {
        ...doc.data().metadata,
        lastMessageAt: doc.data().metadata.lastMessageAt ? 
          (doc.data().metadata.lastMessageAt as Timestamp).toDate() : 
          null
      }
    } as ChannelFrontend));
  },

  async getChannel(spaceId: string, channelId: string): Promise<ChannelFrontend> {
    const channelRef = doc(db, 'spaces', spaceId, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);

    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const data = channelDoc.data();
    return {
      id: channelDoc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      metadata: {
        ...data.metadata,
        lastMessageAt: data.metadata.lastMessageAt ? 
          (data.metadata.lastMessageAt as Timestamp).toDate() : 
          null
      }
    } as ChannelFrontend;
  }
}; 