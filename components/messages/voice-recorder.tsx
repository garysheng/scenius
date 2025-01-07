'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, transcription: string) => Promise<void>;
  isRecording?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isRecording: externalIsRecording }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        try {
          setIsProcessing(true);
          const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
          
          // Create form data for transcription
          const formData = new FormData();
          formData.append('audioFile', audioBlob);

          // Get transcription
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to transcribe audio');
          }

          await onRecordingComplete(audioBlob, data.transcription);
          setError(null);
        } catch (err: any) {
          setError(err.message);
          console.error('Failed to process recording:', err);
        } finally {
          setIsProcessing(false);
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p className="text-xs text-destructive max-w-[200px] truncate">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "ghost"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors",
          isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        {isRecording ? (
          <Square className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>
      {isProcessing && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Transcribing...
        </span>
      )}
    </div>
  );
} 