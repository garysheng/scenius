import { doc, getDoc, setDoc, Timestamp, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const readStatusService = {
  async getLastRead(spaceId: string, channelId: string, userId: string): Promise<Date | null> {
    try {
      const docRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'read_status', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.lastRead as Timestamp).toDate();
      }
      return null;
    } catch (error) {
      console.error('Failed to get last read timestamp:', error);
      return null;
    }
  },

  subscribeToReadStatus(spaceId: string, userId: string, callback: (readStatus: Record<string, Date | null>) => void) {
    // Get all channels first
    const channelsRef = collection(db, 'spaces', spaceId, 'channels');
    
    return onSnapshot(channelsRef, async (channelSnapshot) => {
      const statuses: Record<string, Date | null> = {};
      
      // For each channel, subscribe to its read_status document for the user
      const readStatusPromises = channelSnapshot.docs.map(async (channelDoc) => {
        const readStatusRef = doc(db, 'spaces', spaceId, 'channels', channelDoc.id, 'read_status', userId);
        const readStatusSnap = await getDoc(readStatusRef);
        
        if (readStatusSnap.exists()) {
          const data = readStatusSnap.data();
          statuses[channelDoc.id] = data.lastRead ? (data.lastRead as Timestamp).toDate() : null;
        } else {
          statuses[channelDoc.id] = null;
        }
      });
      
      await Promise.all(readStatusPromises);
      callback(statuses);
    });
  },

  async markAsRead(spaceId: string, channelId: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'spaces', spaceId, 'channels', channelId, 'read_status', userId);
      await setDoc(docRef, {
        lastRead: Timestamp.now(),
        userId
      });
    } catch (error) {
      console.error('Failed to mark channel as read:', error);
    }
  }
}; 