import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { UserFrontend } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: UserFrontend | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUser: (user: UserFrontend | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setFirebaseUser: (firebaseUser) => 
    set((state) => ({ 
      firebaseUser,
      isAuthenticated: !!firebaseUser,
      isLoading: false
    })),
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ 
    firebaseUser: null, 
    user: null, 
    isAuthenticated: false 
  }),
})); 