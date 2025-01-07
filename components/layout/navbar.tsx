'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function Navbar() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  return (
    <nav className="h-14 border-b border-[hsl(var(--border-dim))] bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo/Brand - Always visible */}
        <Link 
          href="/" 
          className="font-semibold text-xl bg-gradient-to-r from-[hsl(var(--text-primary))] to-[hsl(var(--accent-nebula))] bg-clip-text text-transparent hover:to-[hsl(var(--accent-aurora))] transition-all duration-300"
        >
          Scenius
        </Link>

        {/* Auth Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-[hsl(var(--elevation-2))] animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                asChild 
                className="text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--elevation-2))]"
              >
                <Link href="/spaces">Spaces</Link>
              </Button>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] rounded-full blur opacity-0 group-hover:opacity-40 transition duration-300" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="relative w-9 h-9 rounded-full overflow-hidden"
                >
                  <Link href="/profile">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt="Profile" 
                        className="w-7 h-7 rounded-full ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] transition-all duration-300"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[hsl(var(--text-primary))]" />
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button 
                variant="ghost" 
                asChild 
                className="text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--elevation-2))]"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button 
                asChild 
                className="bg-gradient-to-r from-[hsl(var(--human-primary))] to-[hsl(var(--human-secondary))] text-[hsl(var(--text-primary))] hover:from-[hsl(var(--human-primary))] hover:to-[hsl(var(--accent-aurora))] transition-all duration-300"
              >
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 