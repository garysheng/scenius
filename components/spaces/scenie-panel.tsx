'use client';

import { useState, useEffect } from 'react';
import { Calendar, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { scenieService } from '@/lib/services/client/scenie';
import { ChatSummary, VoiceDictation } from '@/types/scenie';
import { MessageFrontend } from '@/types';
import { format } from 'date-fns';

interface SceniePanelProps {
  spaceId: string;
  channelId: string;
  messages: MessageFrontend[];
  channelName: string;
}

export function SceniePanel({ spaceId, channelId, messages, channelName }: SceniePanelProps) {
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [dictation, setDictation] = useState<VoiceDictation | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load latest summary on mount
    const loadLatestSummary = async () => {
      try {
        const latest = await scenieService.getLatestSummary(spaceId, channelId);
        setSummary(latest);
      } catch (err) {
        console.error('Failed to load latest summary:', err);
      }
    };

    loadLatestSummary();
  }, [spaceId, channelId]);

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setError(null);

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const summary = await scenieService.generateChannelSummary(spaceId, channelId, startTime, endTime);
      setSummary(summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateVoice = async () => {
    setIsGeneratingVoice(true);
    setError(null);

    try {
      const newDictation = await scenieService.generateVoiceDictation(
        spaceId,
        channelId,
        messages
      );
      setDictation(newDictation);
    } catch (err) {
      console.error('Failed to generate voice dictation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate voice dictation');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-lg text-muted-foreground italic">
          Let Scenie help you make sense of the #{channelName} chat
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Summary Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Today&apos;s Summary</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
          >
            {isGeneratingSummary && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Generate Summary
          </Button>
        </div>

        {summary && (
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Overview</h4>
                <p className="text-sm text-muted-foreground">{summary.summary}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Topics Discussed</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Key Points</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>

              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Action Items</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {summary.actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Generated at {format(summary.metadata.generatedAt.toDate(), 'PPp')}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Voice Dictation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Voice Dictation</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateVoice}
            disabled={isGeneratingVoice || messages.length === 0}
          >
            {isGeneratingVoice && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Generate Voice
          </Button>
        </div>

        {dictation && dictation.status === 'ready' && dictation.audioUrl && (
          <div className="rounded-md border p-4">
            <audio
              controls
              className="w-full"
              src={dictation.audioUrl}
            >
              Your browser does not support the audio element.
            </audio>
            <div className="mt-2 text-xs text-muted-foreground">
              Generated at {format(dictation.metadata.generatedAt.toDate(), 'PPp')}
              {dictation.metadata.wordCount && (
                <span className="ml-2">• {dictation.metadata.wordCount} words</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 