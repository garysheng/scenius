'use client';

import { PushToTalk } from '@/components/push-to-talk/push-to-talk';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import { ChannelProvider } from '@/lib/contexts/channel-context';

export default function DevPage() {
  const { toast } = useToast();

  const handleRecordingStart = useCallback(() => {
    toast({
      description: "Recording started... Release to send",
      duration: 1000
    });
  }, [toast]);

  const handleRecordingStop = useCallback(async (audioBlob: Blob) => {
    toast({
      description: "Recording stopped - check console for blob",
      duration: 2000
    });
    console.log('Audio blob:', audioBlob);
  }, [toast]);

  return (
    <ChannelProvider>
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-8">Dev Testing Page</h1>
        
        <div className="space-y-12">
          {/* Non-fixed versions */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Non-fixed Versions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg mb-2">Small</h3>
                <div className="p-4 border rounded-lg inline-block">
                  <PushToTalk
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                    showAudioLevel={true}
                    size="small"
                    isFixed={false}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg mb-2">Medium</h3>
                <div className="p-4 border rounded-lg inline-block">
                  <PushToTalk
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                    showAudioLevel={true}
                    size="medium"
                    isFixed={false}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg mb-2">Large</h3>
                <div className="p-4 border rounded-lg inline-block">
                  <PushToTalk
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                    showAudioLevel={true}
                    size="large"
                    isFixed={false}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Fixed versions */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Fixed Positions</h2>
            <div className="p-4 border rounded-lg">
              <p className="text-muted-foreground mb-4">
                The fixed versions should appear at their respective positions on the screen.
              </p>
              
              <PushToTalk
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                showAudioLevel={true}
                size="medium"
                isFixed={true}
                position="top-right"
              />

              <PushToTalk
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                showAudioLevel={true}
                size="medium"
                isFixed={true}
                position="middle-right"
              />

              <PushToTalk
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                showAudioLevel={true}
                size="medium"
                isFixed={true}
                position="bottom-right"
              />
            </div>
          </section>
        </div>
      </main>
    </ChannelProvider>
  );
} 