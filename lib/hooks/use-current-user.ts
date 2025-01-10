import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { adminDb } from '@/lib/firebase-admin';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status?: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        // Get additional user data from Firestore
        const userDoc = await adminDb.collection('users').doc(firebaseUser.uid).get();
        const userData = userDoc.data();

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData?.name || userData?.fullName || 'Unknown User',
          avatarUrl: userData?.avatarUrl || firebaseUser.photoURL || undefined,
          status: userData?.status,
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, isLoading, error };
} 