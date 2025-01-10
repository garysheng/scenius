'use client';

import { ScenieChat } from '@/components/dm/scenie-chat';

export default function ScenieDMPage() {
  return (
    <main className="flex min-h-screen bg-background/95">
      <div className="flex-1 container max-w-4xl mx-auto h-[calc(100vh-4rem)] my-8">
        <div className="h-full rounded-lg border shadow-sm bg-background">
          <ScenieChat 
            spaceId="CwmGtxMRlSmTk95T7Dec" // town square
            userId="N1zZQAcjSVaFkJHQR080RzmmS562" // 
          />
        </div>
      </div>
    </main>
  );
} 