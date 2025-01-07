'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function Navbar() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <nav className="h-14 border-b border-[hsl(var(--border-dim))] sticky top-0 z-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--ai-primary))] via-[hsl(var(--accent-nebula))] to-[hsl(var(--ai-secondary))] animate-gradient-x" />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between relative z-10">
        {/* Logo/Brand - Add glow effect */}
        <Link 
          href="/" 
          className="font-semibold text-xl text-white relative group"
        >
          <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-[hsl(var(--ai-primary))] to-[hsl(var(--accent-nebula))] opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-md rounded-md" />
          <span className="relative">Scenius</span>
        </Link>

        {/* Auth Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-white/10 animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                asChild 
                className="text-white hover:text-white hover:bg-white/10 transition-colors"
              >
                <Link href="/spaces">Spaces</Link>
              </Button>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--ai-primary))] via-[hsl(var(--accent-nebula))] to-[hsl(var(--ai-secondary))] rounded-full blur opacity-0 group-hover:opacity-40 transition duration-300" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="relative w-9 h-9 rounded-full overflow-hidden"
                >
                  <Link href="/profile">
                    {user?.avatarUrl ? (
                      <div className="relative w-7 h-7">
                        <Image 
                          src={user.avatarUrl} 
                          alt="Profile"
                          fill
                          sizes="28px"
                          className="rounded-full object-cover ring-1 ring-[hsl(var(--border-dim))] group-hover:ring-[hsl(var(--border-glow))] transition-all duration-300"
                        />
                      </div>
                    ) : (
                      <User className="w-5 h-5 text-white" />
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
                className="text-white hover:text-white hover:bg-white/10"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button 
                asChild 
                className="bg-white text-[hsl(var(--ai-primary))] hover:bg-white/90 transition-all duration-300"
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