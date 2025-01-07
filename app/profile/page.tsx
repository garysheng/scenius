'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto cosmic-card p-6 animate-pulse">
            <div className="h-32 w-32 rounded-full bg-muted mx-auto" />
            <div className="h-8 w-48 bg-muted mt-4 mx-auto rounded" />
            <div className="h-4 w-64 bg-muted mt-4 mx-auto rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] cosmic-bg p-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--accent-nebula))] to-[hsl(var(--accent-aurora))] rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000" />
            <div className="relative cosmic-card p-8 ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] transition-all duration-300">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto relative">
                  {user.avatarUrl ? (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                      <img
                        src={user.avatarUrl}
                        alt={user.username || 'Profile'}
                        className="relative w-full h-full rounded-full object-cover ring-2 ring-[hsl(var(--border-glow))]"
                      />
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                      <div className="relative w-full h-full rounded-full bg-[hsl(var(--elevation-1))] ring-2 ring-[hsl(var(--border-glow))] flex items-center justify-center">
                        <User className="w-16 h-16 text-[hsl(var(--text-secondary))]" />
                      </div>
                    </div>
                  )}
                </div>
                
                <h1 className="mt-6 text-2xl font-semibold bg-gradient-to-r from-[hsl(var(--text-primary))] to-[hsl(var(--accent-nebula))] bg-clip-text text-transparent">
                  {user.username || user.fullName}
                </h1>
                
                <p className="text-[hsl(var(--text-secondary))] mt-2">
                  {user.email}
                </p>

                <div className="mt-8 space-y-4">
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full hover:text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))] transition-colors"
                  >
                    <Link href="/signout">Sign Out</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 