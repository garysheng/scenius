import { doc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPresence } from '@/types';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export class PresenceService {
  private userId: string;
  private lastActivity: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private currentStatus: 'online' | 'offline' | 'away' | 'dnd' = 'online';

  constructor(userId: string) {
    this.userId = userId;
    this.setupActivityListeners();
  }

  private setupActivityListeners() {
    if (typeof window === 'undefined') return;

    // Track user activity
    const updateActivity = () => {
      this.lastActivity = Date.now();
      // If user was away and becomes active, set them back to online
      if (this.currentStatus === 'away') {
        this.updatePresence('online');
      }
    };

    // Monitor user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Check for inactivity every minute
    this.activityCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      if (timeSinceLastActivity >= IDLE_TIMEOUT && this.currentStatus === 'online') {
        this.updatePresence('away');
      }
    }, 60000); // Check every minute
  }

  async updatePresence(status: UserPresence['status'], customStatus?: string) {
    try {
      this.currentStatus = status;
      const userRef = doc(db, 'users', this.userId);
      await updateDoc(userRef, {
        status,
        lastSeen: Timestamp.now(),
        customStatus: customStatus || null,
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }

  cleanup() {
    if (typeof window === 'undefined') return;

    // Remove event listeners
    window.removeEventListener('mousemove', () => {});
    window.removeEventListener('mousedown', () => {});
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('touchstart', () => {});
    window.removeEventListener('scroll', () => {});

    // Clear interval
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    // Set status to offline when cleaning up
    this.updatePresence('offline');
  }

  // Subscribe to presence changes for a user
  subscribeToPresence(userId: string, callback: (presence: UserPresence) => void) {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          status: data.status,
          lastSeen: data.lastSeen?.toDate(),
          customStatus: data.customStatus,
          updatedAt: data.lastSeen?.toDate() || new Date(),
        });
      }
    });
  }
} 