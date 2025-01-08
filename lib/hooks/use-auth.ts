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
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

// Only used during signup
async function createNewUserDoc(firebaseUser: FirebaseUser, username: string) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const now = Timestamp.fromDate(new Date());
  
  const newUserData: User = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    username,
    fullName: '',
    avatarUrl: null,
    status: 'online',
    lastSeen: now,
    createdAt: now,
    updatedAt: now,
    preferences: {
      notifications: true,
      theme: 'dark',
      language: 'en'
    }
  };
  
  await setDoc(userRef, newUserData);
  return newUserData;
}

// Only updates status and timestamps
async function updateUserStatus(userId: string) {
  const userRef = doc(db, 'users', userId);
  const now = Timestamp.fromDate(new Date());
  
  await setDoc(userRef, {
    status: 'online',
    lastSeen: now,
    updatedAt: now
  }, { merge: true });
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
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            console.error('User document not found after sign in');
            setUser(null);
          } else {
            const userData = userDoc.data() as User;
            setUser(userData);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getAuth();
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    
    // First get the current user data
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    // Then update only the status
    await updateUserStatus(firebaseUser.uid);
    
    // Get the updated user data
    const updatedDoc = await getDoc(userRef);
    const userData = updatedDoc.data() as User;
    setUser(userData);
  };

  const signUp = async (email: string, password: string, username: string) => {
    const auth = getAuth();
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    const userData = await createNewUserDoc(firebaseUser, username);
    setUser(userData);
  };

  const signOut = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.id);
      const now = Timestamp.fromDate(new Date());
      await setDoc(userRef, {
        status: 'offline',
        lastSeen: now,
        updatedAt: now
      }, { merge: true });
    }
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