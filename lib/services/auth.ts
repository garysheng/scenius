import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { SignInFormValues, SignUpFormValues } from '@/types/auth';

export class AuthService {
  private static async createUserProfile(user: FirebaseUser, username: string, fullName: string) {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      username,
      fullName,
      avatarUrl: user.photoURL,
      status: 'online',
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      preferences: {
        notifications: true,
        theme: 'dark',
        language: 'en',
      },
    });
  }

  static async signUp({ email, password, username, fullName }: SignUpFormValues) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await this.createUserProfile(user, username, fullName);
      return user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async signIn({ email, password }: SignInFormValues) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Create profile if it doesn't exist
      const fullName = user.displayName || 'Anonymous';
      const username = user.email?.split('@')[0] || 'user';
      await this.createUserProfile(user, username, fullName);
      
      return user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
} 