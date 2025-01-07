import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPresenceFrontend } from '@/types';

export const presenceService = {
  async updatePresence(userId: string, status: 'online' | 'offline' | 'away' | 'dnd', customStatus?: string) {
    const presenceRef = doc(db, 'presence', userId);
    await setDoc(presenceRef, {
      status,
      customStatus: customStatus || null,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  subscribeToSpacePresence(spaceId: string, callback: (presence: Record<string, UserPresenceFrontend>) => void) {
    // First get all members of the space
    const membersRef = collection(db, 'spaces', spaceId, 'members');
    const membersQuery = query(membersRef);

    return onSnapshot(membersQuery, (membersSnapshot) => {
      const memberIds = membersSnapshot.docs.map(doc => doc.id);
      
      // If there are no members, return empty presence data
      if (memberIds.length === 0) {
        callback({});
        return;
      }

      // Then subscribe to presence for all members
      const presenceRef = collection(db, 'presence');
      const presenceQuery = query(presenceRef, where('__name__', 'in', memberIds));

      return onSnapshot(presenceQuery, (presenceSnapshot) => {
        const presence: Record<string, UserPresenceFrontend> = {};
        
        presenceSnapshot.docs.forEach(doc => {
          const data = doc.data();
          presence[doc.id] = {
            status: data.status || 'offline',
            customStatus: data.customStatus,
            lastSeen: data.lastSeen?.toDate(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });

        // Set offline status for members without presence data
        memberIds.forEach(memberId => {
          if (!presence[memberId]) {
            presence[memberId] = {
              status: 'offline',
              updatedAt: new Date()
            };
          }
        });

        callback(presence);
      });
    });
  }
}; 