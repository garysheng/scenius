'use client';

import { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, transcription: string) => Promise<void>;
  isRecording?: boolean;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try different MIME types for better browser compatibility
      const mimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/wav',
        'audio/ogg'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio MIME type found');
      }

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType
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
          const audioBlob = new Blob(chunks.current, { type: selectedMimeType });
          
          // Create form data for transcription
          const formData = new FormData();
          formData.append('audio', audioBlob);

          // Get transcription
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
            },
            body: formData,
          });

          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response:', await response.text());
            throw new Error('Server returned non-JSON response');
          }

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to transcribe audio');
          }

          await onRecordingComplete(audioBlob, data.transcript);
          setError(null);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unknown error occurred');
          }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
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