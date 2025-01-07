import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
}

export const usersService: UserService = {
  async getUser(userId: string): Promise<UserFrontend> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const data = userDoc.data() as User;
    return {
      email: data.email,
      username: data.username,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      status: data.status,
      preferences: data.preferences,
      walletAddresses: data.walletAddresses,
      id: userDoc.id,
      lastSeen: data.lastSeen?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
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
  }
}; 