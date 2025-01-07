'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth';
import { useAuth } from '@/lib/hooks/use-auth';

export default function SignOutPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await AuthService.signOut();
        signOut(); // Clear auth store state
        router.push('/signin');
      } catch (error) {
        console.error('Failed to sign out:', error);
        router.push('/signin');
      }
    };

    handleSignOut();
  }, [router, signOut]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 cosmic-bg">
      <div className="text-center space-y-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Signing out...</p>
      </div>
    </main>
  );
} 