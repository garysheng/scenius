'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersService } from '@/lib/services/client/users';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.fullName || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleUpdateDisplayName = async () => {
    if (!user || !displayName.trim() || isUpdating) return;

    try {
      setIsUpdating(true);
      setError(null);
      await usersService.updateUser(user.id, { fullName: displayName.trim() });
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update display name');
      }
    } finally {
      setIsUpdating(false);
    }
  };

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
                    <div className="relative group w-full h-full">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                      <div className="relative w-full h-full">
                        <Image
                          src={user.avatarUrl}
                          alt={user.username || 'Profile'}
                          fill
                          sizes="128px"
                          className="rounded-full object-cover ring-2 ring-[hsl(var(--border-glow))]"
                        />
                      </div>
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
                
                <div className="mt-6 space-y-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-[hsl(var(--text-primary))]">Display Name</Label>
                      <div className="flex gap-2">
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="cosmic-input"
                          placeholder="Enter your display name"
                          disabled={isUpdating}
                        />
                        <Button
                          size="icon"
                          onClick={handleUpdateDisplayName}
                          disabled={isUpdating || !displayName.trim()}
                          className="shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setIsEditing(false);
                            setDisplayName(user.fullName || '');
                          }}
                          disabled={isUpdating}
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {error && (
                        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <h1 className="text-2xl font-semibold bg-gradient-to-r from-[hsl(var(--text-primary))] to-[hsl(var(--accent-nebula))] bg-clip-text text-transparent">
                        {user.fullName || user.username}
                      </h1>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <p className="text-[hsl(var(--text-secondary))] mt-2">
                  {user.email}
                </p>

                <div className="mt-8 space-y-4">
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full text-[hsl(var(--text-primary))] hover:text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))] transition-colors"
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