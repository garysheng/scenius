import { collection, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserFrontend } from '@/types';

interface UpdateUserData {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
}

interface UserService {
  getUser(userId: string): Promise<UserFrontend>;
  getUsers(userIds: string[]): Promise<Record<string, UserFrontend>>;
  updateUser(userId: string, data: UpdateUserData): Promise<void>;
  getSpaceUsers(spaceId: string): Promise<Record<string, UserFrontend>>;
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
      lastSeen: userData.lastSeen.toDate(),
      createdAt: userData.createdAt.toDate(),
      updatedAt: userData.updatedAt.toDate()
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
        lastSeen: userData.lastSeen.toDate(),
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate()
      };
    });

    return users;
  }
}; 