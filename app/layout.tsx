import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Providers } from './providers';
import { urlService } from '@/lib/services/client/url';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Scenius",
  description: "An AI & crypto-first community platform where members earn points and tokens for valuable contributions, and deploy blockchain-integrated AI agents that represent and take actions on behalf of the community.",
  metadataBase: urlService.config.getMetadataBase(),
  openGraph: {
    title: 'Scenius',
    description: 'An AI & crypto-first community platform where members earn points and tokens for valuable contributions, and deploy blockchain-integrated AI agents that represent and take actions on behalf of the community.',
    type: 'website',
    images: [
      {
        url: '/share.png',
        width: 1920,
        height: 1080,
        alt: 'Scenius - AI & crypto-first community platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scenius',
    description: 'An AI & crypto-first community platform where members earn points and tokens for valuable contributions, and deploy blockchain-integrated AI agents that represent and take actions on behalf of the community.',
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
        <Toaster />
        <div id="portal-root" />
      </body>
    </html>
  );
}
