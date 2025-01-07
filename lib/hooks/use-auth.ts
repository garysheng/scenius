'use client';

import { useEffect, useState } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

async function createOrUpdateUserDoc(firebaseUser: FirebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create new user document
    await setDoc(userRef, {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      username: firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 6)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        lastSignIn: serverTimestamp()
      }
    });
  } else {
    // Update last sign in
    await setDoc(userRef, {
      metadata: {
        lastSignIn: serverTimestamp()
      }
    }, { merge: true });
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ensure user document exists
          await createOrUpdateUserDoc(firebaseUser);

          // Get the user document
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as User;

          setUser(userData);
          setIsLoading(false);
        } catch (error) {
          console.error('Error setting up user:', error);
          setUser(null);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getAuth();
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserDoc(firebaseUser);
  };

  const signUp = async (email: string, password: string, username: string) => {
    const auth = getAuth();
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document with username
    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      metadata: {
        lastSignIn: serverTimestamp()
      }
    });
  };

  const signOut = async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut
  };
} 