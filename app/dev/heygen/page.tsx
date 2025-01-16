'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSpacesAndChannels } from '@/lib/hooks/use-spaces-and-channels';
import { ChannelFrontend } from '@/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HeyGenTestPage() {
  const { spaces, getChannelsForSpace, loading: spacesLoading } = useSpacesAndChannels();
  const [spaceId, setSpaceId] = useState<string>('');
  const [channelId, setChannelId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Get channels for selected space
  const channels = spaceId ? getChannelsForSpace(spaceId) : [];

  // Get selected channel
  const selectedChannel = channels.find(c => c.id === channelId);

  // Format participant names for DM
  const getParticipantNames = (channel: ChannelFrontend) => {
    if (channel.kind !== 'DM' || !channel.metadata.participants?.length) return '';
    return channel.metadata.participants
      .map(p => p.username || p.fullName || p.email)
      .join(' and ');
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    setVideoUrl(null);
    setLogs([]);
    
    try {
      addLog('Starting video synthesis test...');
      
      const response = await fetch('/api/dev/heygen/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId,
          channelId,
          message,
          userId: 'test-user'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      if (data.status === 'completed' && data.video_url) {
        addLog('Video synthesis completed successfully!');
        setResult('Video synthesis completed successfully!');
        setVideoUrl(data.video_url);
      } else {
        throw new Error('Video generation did not complete successfully');
      }
    } catch (error) {
      console.error('Test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error: ${errorMessage}`);
      setResult(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (spacesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>        
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">HeyGen Video Synthesis Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Space</label>
            <Select
              value={spaceId}
              onValueChange={(value) => {
                setSpaceId(value);
                setChannelId(''); // Reset channel when space changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <Select
              value={channelId}
              onValueChange={setChannelId}
              disabled={!spaceId}
            >
              <SelectTrigger>
                <SelectValue placeholder={spaceId ? "Select a channel" : "Select a space first"} />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.kind === 'DM' 
                      ? `DM: ${getParticipantNames(channel)}`
                      : channel.name
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedChannel?.kind === 'DM' && (
            <div className="text-sm text-muted-foreground">
              Testing video synthesis in DM between {getParticipantNames(selectedChannel)}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Test Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message to trigger video synthesis"
              rows={4}
            />
          </div>

          <Button 
            onClick={handleTest}
            disabled={loading || !message.trim() || !spaceId || !channelId}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Test Video Synthesis'}
          </Button>

          {result && (
            <div className={`p-4 rounded ${
              result.startsWith('Error') ? 'bg-red-500/10' : 'bg-green-500/10'
            }`}>
              {result}
              {videoUrl && (
                <div className="mt-2">
                  <a 
                    href={videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Generated Video
                  </a>
                </div>
              )}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Progress Logs</h2>
              <div className="bg-muted p-4 rounded space-y-1 max-h-60 overflow-y-auto font-mono text-sm">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 