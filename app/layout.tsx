import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Providers } from './providers';

export const metadata: Metadata = {
  title: "Scenius",
  description: "AI-native collaboration platform for innovation communities",
  openGraph: {
    images: [
      {
        url: '/share.png',
        width: 1920,
        height: 1080,
        alt: 'Scenius'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/share.png']
  }
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </Providers>
        <div id="portal-root" />
      </body>
    </html>
  );
}
