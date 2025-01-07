'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserFrontend } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setFirebaseUser, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (!firebaseUser) {
        setIsLoading(false);
        return;
      }

      // Listen for Firestore user document changes
      const userRef = doc(db, 'users', firebaseUser.uid);
      const unsubUser = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const user: UserFrontend = {
            ...userData,
            id: doc.id,
            lastSeen: userData.lastSeen?.toDate(),
            createdAt: userData.createdAt?.toDate(),
            updatedAt: userData.updatedAt?.toDate(),
          } as UserFrontend;
          
          setUser(user);
        }
        setIsLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsubAuth();
  }, [setFirebaseUser, setUser, setIsLoading]);

  return <>{children}</>;
} 