import { z } from 'zod';

// Form Schemas
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Form Types
export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

// Auth State Types
export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Auth Provider Types
export type AuthProvider = 'email' | 'google' | 'github' | 'discord';

// Auth Config Types
export interface AuthConfig {
  providers: {
    email: boolean;
    google: boolean;
    github?: boolean;
    discord?: boolean;
  };
  redirects: {
    signIn: string;
    signUp: string;
    afterSignIn: string;
    afterSignUp: string;
  };
  session: {
    expiryTime: number; // in seconds
    refreshThreshold: number; // in seconds
  };
}

// Auth Error Types
export interface AuthError {
  code: string;
  message: string;
} 