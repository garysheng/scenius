'use client';

import { SignInForm } from '@/components/auth/sign-in-form';
import { TwinklingStars } from '@/components/effects/twinkling-stars';
import { CursorStars } from '@/components/effects/cursor-stars';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 cosmic-bg">
      <TwinklingStars />
      <CursorStars />
      <div className="w-full max-w-md relative z-10">
        <SignInForm />
      </div>
    </main>
  );
} 