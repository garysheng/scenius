import { collection, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { User, UserFrontend } from '@/types';

interface UpdateUserData {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  settings?: {
    autoResponseEnabled?: boolean;
  };
}

interface UserService {
  getUser(userId: string): Promise<UserFrontend>;
  getUsers(userIds: string[]): Promise<Record<string, UserFrontend>>;
  updateUser(userId: string, data: UpdateUserData): Promise<void>;
  getSpaceUsers(spaceId: string): Promise<Record<string, UserFrontend>>;
  uploadProfilePicture(userId: string, file: File): Promise<string>;
  removeProfilePicture(userId: string): Promise<void>;
}

export const usersService: UserService = {
  async getUser(userId: string): Promise<UserFrontend> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as User;
    return {
      ...userData,
      id: userDoc.id,
      lastSeen: userData.lastSeen?.toDate() || new Date(),
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      email: userData.email || '',
      username: userData.username || '',
      fullName: userData.fullName || '',
      avatarUrl: userData.avatarUrl || null,
      status: userData.status || 'offline',
      preferences: userData.preferences || {
        notifications: true,
        theme: 'dark',
        language: 'en'
      }
    };
  },

  async getUsers(userIds: string[]): Promise<Record<string, UserFrontend>> {
    const users: Record<string, UserFrontend> = {};
    
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          users[userId] = await this.getUser(userId);
        } catch (err) {
          console.error(`Failed to load user ${userId}:`, err);
        }
      })
    );

    return users;
  },

  async updateUser(userId: string, data: UpdateUserData): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async getSpaceUsers(spaceId: string): Promise<Record<string, UserFrontend>> {
    // First get all members of the space
    const membersRef = collection(db, 'spaces', spaceId, 'members');
    const membersSnapshot = await getDocs(membersRef);
    const memberIds = membersSnapshot.docs.map(doc => doc.id);

    if (memberIds.length === 0) {
      return {};
    }

    // Then get all user documents
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('__name__', 'in', memberIds));
    const usersSnapshot = await getDocs(usersQuery);

    const users: Record<string, UserFrontend> = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data() as User;
      users[doc.id] = {
        ...userData,
        id: doc.id,
        lastSeen: userData.lastSeen?.toDate() || new Date(),
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        email: userData.email || '',
        username: userData.username || '',
        fullName: userData.fullName || '',
        avatarUrl: userData.avatarUrl || null,
        status: userData.status || 'offline',
        preferences: userData.preferences || {
          notifications: true,
          theme: 'dark',
          language: 'en'
        }
      };
    });

    return users;
  },

  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    const storage = getStorage();
    const imageRef = ref(storage, `users/${userId}/profile-picture`);
    
    await uploadBytes(imageRef, file);
    const downloadUrl = await getDownloadURL(imageRef);

    // Update the user document with the new image URL
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      avatarUrl: downloadUrl,
      updatedAt: serverTimestamp()
    });

    return downloadUrl;
  },

  async removeProfilePicture(userId: string): Promise<void> {
    const storage = getStorage();
    const imageRef = ref(storage, `users/${userId}/profile-picture`);
    
    try {
      await deleteObject(imageRef);
    } catch (error) {
      // Ignore if file doesn't exist
      console.log('No existing profile picture to delete', error);
    }

    // Update the user document to remove the image URL
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      avatarUrl: null,
      updatedAt: serverTimestamp()
    });
  }
}; 