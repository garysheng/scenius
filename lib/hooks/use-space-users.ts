import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserFrontend } from '@/types';

export function useSpaceUsers(spaceId: string) {
  const [users, setUsers] = useState<UserFrontend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (!spaceId) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch space members
        const membersRef = collection(db, 'spaces', spaceId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        // Get all user IDs from members
        const userIds = membersSnapshot.docs.map(doc => doc.id);
        
        if (userIds.length === 0) {
          setUsers([]);
          return;
        }

        // Fetch user details
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('__name__', 'in', userIds));
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserFrontend[];

        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching space users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [spaceId]);

  return {
    users,
    loading,
    error
  };
} 