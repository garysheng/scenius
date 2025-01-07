import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  collectionGroup,
  updateDoc,
  deleteDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Space, SpaceFrontend } from '@/types';
import { getAuth } from 'firebase/auth';

/**
 * Client-side service for managing spaces in Firebase
 * This service is used in the browser and handles user-facing operations
 */
export const spacesService = {
  createSpace: async function(data: Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'metadata' | 'ownerId'>): Promise<string> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to create a space');
    }

    const spaceRef = doc(collection(db, 'spaces'));
    const batch = writeBatch(db);

    // Create the space
    batch.set(spaceRef, {
      ...data,
      ownerId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        memberCount: 1,
        channelCount: 2 // Starting with 2 default channels
      }
    });

    // Add creator as a member
    const memberRef = doc(collection(db, 'spaces', spaceRef.id, 'members'), auth.currentUser.uid);
    batch.set(memberRef, {
      userId: auth.currentUser.uid,
      role: 'owner',
      joinedAt: serverTimestamp()
    });

    // Create default channels
    const generalRef = doc(collection(db, 'spaces', spaceRef.id, 'channels'));
    const randomRef = doc(collection(db, 'spaces', spaceRef.id, 'channels'));

    batch.set(generalRef, {
      name: 'general',
      description: 'General discussion',
      type: 'TEXT',
      spaceId: spaceRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        messageCount: 0,
        lastMessageAt: null
      }
    });

    batch.set(randomRef, {
      name: 'random',
      description: 'Random discussions and off-topic chat',
      type: 'TEXT',
      spaceId: spaceRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        messageCount: 0,
        lastMessageAt: null
      }
    });

    await batch.commit();
    return spaceRef.id;
  },

  async getSpaces(): Promise<SpaceFrontend[]> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to view spaces');
    }

    // Query all members subcollections for documents where userId matches
    const membersQuery = query(
      collectionGroup(db, 'members'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('joinedAt', 'desc')
    );
    
    const memberDocs = await getDocs(membersQuery);
    const spaces: SpaceFrontend[] = [];

    // Get parent space documents
    for (const memberDoc of memberDocs.docs) {
      const spaceId = memberDoc.ref.parent.parent?.id;
      if (spaceId) {
        const spaceDoc = await getDoc(doc(db, 'spaces', spaceId));
        if (spaceDoc.exists()) {
          const data = spaceDoc.data();
          spaces.push({
            id: spaceDoc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate()
          } as SpaceFrontend);
        }
      }
    }

    return spaces;
  },

  async getSpace(id: string): Promise<SpaceFrontend> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to view a space');
    }

    // Check if user is a member of this space
    const memberDoc = await getDoc(doc(db, 'spaces', id, 'members', auth.currentUser.uid));
    if (!memberDoc.exists()) {
      throw new Error('You do not have access to this space');
    }

    const spaceDoc = await getDoc(doc(db, 'spaces', id));
    if (!spaceDoc.exists()) {
      throw new Error('Space not found');
    }

    const data = spaceDoc.data();
    return {
      id: spaceDoc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate()
    } as SpaceFrontend;
  },

  async updateSpace(id: string, data: Partial<Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'metadata'>>) {
    const spaceRef = doc(db, 'spaces', id);
    await updateDoc(spaceRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteSpace(id: string) {
    const spaceRef = doc(db, 'spaces', id);
    await deleteDoc(spaceRef);
  },

  async joinSpace(id: string) {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to join a space');
    }

    // Check if space exists
    const spaceRef = doc(db, 'spaces', id);
    const spaceDoc = await getDoc(spaceRef);
    if (!spaceDoc.exists()) {
      throw new Error('Space not found');
    }

    // Check if user is already a member
    const memberRef = doc(db, 'spaces', id, 'members', auth.currentUser.uid);
    const memberDoc = await getDoc(memberRef);
    if (memberDoc.exists()) {
      throw new Error('You are already a member of this space');
    }

    // Add user as member
    await setDoc(memberRef, {
      userId: auth.currentUser.uid,
      role: 'member',
      joinedAt: serverTimestamp()
    });

    // Update member count
    await updateDoc(spaceRef, {
      'metadata.memberCount': increment(1)
    });
  },

  async leaveSpace(id: string, userId: string) {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to leave a space');
    }

    // Check if space exists
    const spaceRef = doc(db, 'spaces', id);
    const spaceDoc = await getDoc(spaceRef);
    if (!spaceDoc.exists()) {
      throw new Error('Space not found');
    }

    // Check if user is a member
    const memberRef = doc(db, 'spaces', id, 'members', userId);
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      throw new Error('You are not a member of this space');
    }

    // Check if user is the owner
    const spaceData = spaceDoc.data();
    if (spaceData.ownerId === userId) {
      throw new Error('Space owner cannot leave the space. Transfer ownership or delete the space instead.');
    }

    // Remove user from members
    await deleteDoc(memberRef);

    // Update member count
    await updateDoc(spaceRef, {
      'metadata.memberCount': increment(-1)
    });
  },
}; 