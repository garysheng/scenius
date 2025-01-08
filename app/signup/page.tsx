'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FcGoogle } from 'react-icons/fc';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TwinklingStars } from '@/components/effects/twinkling-stars';
import { CursorStars } from '@/components/effects/cursor-stars';

import { SignUpFormValues, signUpSchema } from '@/types/auth';
import { AuthService } from '@/lib/services/auth';

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      fullName: '',
    },
    mode: 'onChange',
  });

  const { formState: { errors, isValid }, getValues, trigger } = form;

  const validateInitialFields = async () => {
    const result = await trigger(['email', 'username']);
    if (result) {
      setShowAdditionalFields(true);
    }
  };

  const onSubmit = async (data: SignUpFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await AuthService.signUp(data);
      router.push('/spaces');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await AuthService.signInWithGoogle();
      router.push('/spaces');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 cosmic-bg">
      <TwinklingStars />
      <CursorStars />
      <div className="w-full max-w-md relative z-10">
        <div className="space-y-6">
          <div className="flex justify-center mb-8">
            <div className="animate-float">
              <Image
                src="/logo.png"
                alt="Scenius Logo"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-purple-400">Create Your Account</h1>
            <p className="text-sm text-muted-foreground">
              Join Scenius - An AI & crypto-first community platform where members earn points and tokens for valuable contributions.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...form.register('email')}
                className="bg-background/50"
                onBlur={() => validateInitialFields()}
              />
              {errors.email && (
                <p className="text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                {...form.register('username')}
                className="bg-background/50"
                onBlur={() => validateInitialFields()}
              />
              {errors.username && (
                <p className="text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            <AnimatePresence>
              {showAdditionalFields && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Your full name"
                      {...form.register('fullName')}
                      className="bg-background/50"
                    />
                    {errors.fullName && (
                      <p className="text-xs text-red-500">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...form.register('password')}
                      className="bg-background/50"
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      {...form.register('confirmPassword')}
                      className="bg-background/50"
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              disabled={isLoading || !isValid}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted-foreground/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OR CONTINUE WITH</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <FcGoogle className="mr-2 h-4 w-4" />
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
} 