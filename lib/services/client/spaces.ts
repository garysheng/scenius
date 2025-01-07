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
  increment,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Space, SpaceFrontend, Member, SpaceSettings } from '@/types/spaces';
import { getAuth } from 'firebase/auth';
import { accessControlService } from './access-control';

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
      kind: 'CHANNEL',
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
      kind: 'CHANNEL',
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

  async getMemberRole(spaceId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
    try {
      const memberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', userId));
      if (!memberDoc.exists()) return null;
      return memberDoc.data().role;
    } catch (error) {
      console.error('Error getting member role:', error);
      return null;
    }
  },

  async getSpaceSettings(spaceId: string): Promise<SpaceSettings> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to view space settings');
    }

    const settingsDoc = await getDoc(doc(db, 'spaces', spaceId, 'settings', 'preferences'));
    if (!settingsDoc.exists()) {
      return {};
    }

    return settingsDoc.data() as SpaceSettings;
  },

  async updateSpaceSettings(spaceId: string, settings: SpaceSettings) {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to update space settings');
    }

    const settingsRef = doc(db, 'spaces', spaceId, 'settings', 'preferences');
    await setDoc(settingsRef, settings, { merge: true });
  },

  async getSpaceMembers(spaceId: string): Promise<Member[]> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to view members');
    }

    const membersRef = collection(db, 'spaces', spaceId, 'members');
    const membersSnapshot = await getDocs(membersRef);
    
    const members: Member[] = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const userDoc = await getDoc(doc(db, 'users', memberData.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        members.push({
          id: memberData.userId,
          name: userData.fullName,
          email: userData.email,
          role: memberData.role as 'owner' | 'admin' | 'member'
        });
      }
    }

    return members;
  },

  async inviteMember(spaceId: string, email: string): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to invite members');
    }

    // Check if user has permission to invite
    const currentMemberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', auth.currentUser.uid));
    if (!currentMemberDoc.exists()) {
      throw new Error('You do not have permission to invite members');
    }
    const currentMemberRole = currentMemberDoc.data().role;
    if (currentMemberRole !== 'owner' && currentMemberRole !== 'admin') {
      throw new Error('Only owners and admins can invite members');
    }

    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userId = userSnapshot.docs[0].id;

    // Check if user is already a member
    const memberRef = doc(db, 'spaces', spaceId, 'members', userId);
    const memberDoc = await getDoc(memberRef);
    if (memberDoc.exists()) {
      throw new Error('User is already a member of this space');
    }

    // Add user as member
    await setDoc(memberRef, {
      userId,
      role: 'member',
      joinedAt: serverTimestamp()
    });

    // Update member count
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      'metadata.memberCount': increment(1)
    });
  },

  async updateMemberRole(spaceId: string, memberId: string, newRole: 'admin' | 'member'): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to update member roles');
    }

    // Check if current user has permission
    const currentMemberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', auth.currentUser.uid));
    if (!currentMemberDoc.exists() || currentMemberDoc.data().role !== 'owner') {
      throw new Error('Only the space owner can update member roles');
    }

    // Update member role
    const memberRef = doc(db, 'spaces', spaceId, 'members', memberId);
    await updateDoc(memberRef, {
      role: newRole
    });
  },

  async removeMember(spaceId: string, memberId: string): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to remove members');
    }

    // Check if current user has permission
    const currentMemberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', auth.currentUser.uid));
    if (!currentMemberDoc.exists()) {
      throw new Error('You do not have permission to remove members');
    }
    const currentMemberRole = currentMemberDoc.data().role;

    // Get target member's role
    const targetMemberDoc = await getDoc(doc(db, 'spaces', spaceId, 'members', memberId));
    if (!targetMemberDoc.exists()) {
      throw new Error('Member not found');
    }
    const targetMemberRole = targetMemberDoc.data().role;

    // Check permissions
    if (currentMemberRole !== 'owner') {
      if (currentMemberRole !== 'admin' || targetMemberRole === 'owner' || targetMemberRole === 'admin') {
        throw new Error('You do not have permission to remove this member');
      }
    }

    if (targetMemberRole === 'owner') {
      throw new Error('Cannot remove the space owner');
    }

    // Remove member
    await deleteDoc(doc(db, 'spaces', spaceId, 'members', memberId));

    // Update member count
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      'metadata.memberCount': increment(-1)
    });
  },

  async revokeInviteLink(spaceId: string, inviteId: string): Promise<void> {
    return accessControlService.revokeInviteLink(spaceId, inviteId);
  },

  async getPublicSpaces(): Promise<SpaceFrontend[]> {
    const spacesRef = collection(db, 'spaces');
    const spacesQuery = query(
      spacesRef,
      where('isPublic', '==', true),
      orderBy('metadata.memberCount', 'desc'),
      limit(6)
    );
    
    const spaceDocs = await getDocs(spacesQuery);
    const spaces: SpaceFrontend[] = [];

    for (const spaceDoc of spaceDocs.docs) {
      const data = spaceDoc.data();
      spaces.push({
        id: spaceDoc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as SpaceFrontend);
    }

    return spaces;
  }
}; 