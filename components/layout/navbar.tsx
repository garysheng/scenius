'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function Navbar() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <nav className="h-14 border-b border-[hsl(var(--border-dim))] bg-[#7C3AED] backdrop-blur supports-[backdrop-filter]:bg-[#7C3AED] sticky top-0 z-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/80 via-[#9D5BF0]/60 to-[#7C3AED]/80 animate-gradient-x" />
      <div className="absolute inset-0 bg-[#7C3AED] mix-blend-overlay opacity-50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between relative z-10">
        {/* Logo/Brand - Always visible */}
        <Link 
          href="/" 
          className="font-semibold text-xl text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-primary))/90] transition-colors"
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
                className="text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-primary))] hover:bg-[#8B4EF5]"
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
                className="text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-primary))] hover:bg-[#8B4EF5]"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button 
                asChild 
                className="bg-[hsl(var(--text-primary))] text-[#7C3AED] hover:bg-[hsl(var(--text-primary))/90] transition-all duration-300"
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