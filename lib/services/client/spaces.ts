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
  writeBatch,
  collectionGroup
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
  }
}; 