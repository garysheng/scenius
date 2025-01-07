'use client';

import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-black via-purple-950/20 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0" style={{ 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundSize: '50px 50px',
        opacity: 0.5,
      }} />
      <div className="relative">
        <div className="absolute -inset-1">
          <div className="w-full h-full rotate-180 opacity-30 blur-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />
        </div>
        <SignInForm />
      </div>
    </main>
  );
} 