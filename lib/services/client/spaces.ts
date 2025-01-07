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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

    // Create initial access config
    const accessRef = doc(db, 'spaces', spaceRef.id, 'access', 'config');
    batch.set(accessRef, {
      spaceId: spaceRef.id,
      emailList: {
        enabled: false,
        emails: []
      },
      domains: [],
      inviteLinks: [],
      roleAssignment: {
        defaultRole: 'member',
        rules: []
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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

    try {
      console.log('Fetching space:', id);
      
      // First check if user has access before fetching any space data
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const { hasAccess } = await accessControlService.validateAccess(id, auth.currentUser.uid, userData.email);
      
      // Check membership
      const memberDoc = await getDoc(doc(db, 'spaces', id, 'members', auth.currentUser.uid));
      const isMember = memberDoc.exists();

      // If not a member and no access, deny immediately
      if (!isMember && !hasAccess) {
        console.log('Access denied:', { userId: auth.currentUser.uid, spaceId: id });
        throw new Error('You do not have access to this space');
      }

      // Only fetch space data if access is granted
      const spaceDoc = await getDoc(doc(db, 'spaces', id));
      if (!spaceDoc.exists()) {
        console.log('Space not found:', id);
        throw new Error('Space not found');
      }

      const spaceData = spaceDoc.data();
      
      // Double check for public access if not a member
      if (!isMember && !hasAccess && !spaceData.settings?.isPublic) {
        console.log('Access denied - not public:', { userId: auth.currentUser.uid, spaceId: id });
        throw new Error('You do not have access to this space');
      }

      console.log('Space access granted:', { userId: auth.currentUser.uid, spaceId: id });

      return {
        id: spaceDoc.id,
        ...spaceData,
        createdAt: (spaceData.createdAt as Timestamp).toDate(),
        updatedAt: (spaceData.updatedAt as Timestamp).toDate()
      } as SpaceFrontend;
    } catch (error) {
      console.error('Error getting space:', error);
      throw error;
    }
  },

  async updateSpace(id: string, data: Partial<Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'metadata'>>) {
    const spaceRef = doc(db, 'spaces', id);
    await updateDoc(spaceRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteSpace(id: string) {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to delete a space');
    }

    // Check if user is the owner
    const spaceRef = doc(db, 'spaces', id);
    const spaceDoc = await getDoc(spaceRef);
    if (!spaceDoc.exists()) {
      throw new Error('Space not found');
    }
    if (spaceDoc.data().ownerId !== currentUser.uid) {
      throw new Error('Only the space owner can delete the space');
    }

    const batch = writeBatch(db);

    // Delete all members
    const membersSnapshot = await getDocs(collection(db, 'spaces', id, 'members'));
    membersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete all channels and their messages
    const channelsSnapshot = await getDocs(collection(db, 'spaces', id, 'channels'));
    for (const channelDoc of channelsSnapshot.docs) {
      // Delete all messages in the channel
      const messagesSnapshot = await getDocs(collection(db, 'spaces', id, 'channels', channelDoc.id, 'messages'));
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      batch.delete(channelDoc.ref);
    }

    // Delete access config
    const accessConfigRef = doc(db, 'spaces', id, 'access', 'config');
    batch.delete(accessConfigRef);

    // Delete settings
    const settingsRef = doc(db, 'spaces', id, 'settings', 'preferences');
    batch.delete(settingsRef);

    // Delete the space document itself
    batch.delete(spaceRef);

    // Delete any space files from storage
    try {
      const storage = getStorage();
      const spaceStorageRef = ref(storage, `spaces/${id}`);
      await deleteObject(spaceStorageRef);
    } catch (error) {
      // Ignore errors if no files exist
      console.log('No space files to delete or error deleting files:', error);
    }

    // Commit all deletions
    await batch.commit();
  },

  async joinSpace(id: string, role: 'owner' | 'admin' | 'member' = 'member') {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to join a space');
    }

    try {
      console.log('Attempting to join space:', { spaceId: id, userId: currentUser.uid, role });

      // Check if space exists
      const spaceRef = doc(db, 'spaces', id);
      const spaceDoc = await getDoc(spaceRef);
      if (!spaceDoc.exists()) {
        console.log('Space not found:', id);
        throw new Error('Space not found');
      }

      // Check if user is already a member
      const memberRef = doc(db, 'spaces', id, 'members', currentUser.uid);
      const memberDoc = await getDoc(memberRef);
      if (memberDoc.exists()) {
        console.log('User is already a member:', { userId: currentUser.uid, spaceId: id });
        throw new Error('You are already a member of this space');
      }

      // Add user as member with the specified role
      await setDoc(memberRef, {
        userId: currentUser.uid,
        role,
        joinedAt: serverTimestamp()
      });

      // Update member count
      await updateDoc(spaceRef, {
        'metadata.memberCount': increment(1)
      });

      // Get space data for welcome message
      const spaceData = spaceDoc.data();
      
      // Get recent messages for AI recap
      const messagesQuery = query(
        collectionGroup(db, 'messages'),
        where('spaceId', '==', id),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const recentMessages = messagesSnapshot.docs.map(doc => doc.data());

      // Generate AI recap (placeholder for now)
      const workspaceRecap = recentMessages.length > 0 
        ? 'Recent discussions include various topics and active conversations.'
        : 'This space is just getting started. Be the first to start a conversation!';

      // Return welcome data
      return {
        name: spaceData.name,
        description: spaceData.description,
        workspaceRecap
      };

  
    } catch (error) {
      console.error('Error joining space:', error);
      throw error;
    }
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
      where('settings.isPublic', '==', true),
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
  },

  async uploadSpaceImage(spaceId: string, file: File): Promise<string> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to upload an image');
    }

    const storage = getStorage();
    const imageRef = ref(storage, `spaces/${spaceId}/profile-picture`);
    
    await uploadBytes(imageRef, file);
    const downloadUrl = await getDownloadURL(imageRef);

    // Update the space document with the new image URL
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      imageUrl: downloadUrl
    });

    return downloadUrl;
  },

  async removeSpaceImage(spaceId: string): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be signed in to remove an image');
    }

    const storage = getStorage();
    const imageRef = ref(storage, `spaces/${spaceId}/profile-picture`);
    
    try {
      await deleteObject(imageRef);
    } catch (error) {
      // Ignore if file doesn't exist
      console.log('No existing image to delete', error);
    }

    // Update the space document to remove the image URL
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      imageUrl: null
    });
  }
}; 