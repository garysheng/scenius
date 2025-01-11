# Push-to-Talk Component

A reusable push-to-talk component that provides a floating microphone button and handles audio recording and transcription. The component is agnostic of what happens with the recorded audio, exposing callbacks for recording start and stop events.

## Features

- Floating microphone button positioned at middle-right of screen
- Visual feedback during recording (pulsing animation, recording indicator)
- Keyboard shortcut support (space bar hold)
- Audio level visualization
- Haptic feedback on mobile devices
- Accessibility support
- Permission handling for microphone access
- Automatic transcription of voice messages

## Usage

```tsx
import { usePushToTalk } from '@/components/push-to-talk';

function YourComponent() {
  const handleRecordingStart = () => {
    console.log('Recording started');
  };

  const handleRecordingStop = async (audioBlob: Blob) => {
    console.log('Recording stopped, audio blob:', audioBlob);
    // Audio is automatically transcribed and sent to the server
    // The transcription is included in the message content
  };

  return (
    <PushToTalk
      onRecordingStart={handleRecordingStart}
      onRecordingStop={handleRecordingStop}
      position="middle-right" // optional, defaults to middle-right
      showAudioLevel={true}   // optional, defaults to true
      size="medium"           // optional: 'small' | 'medium' | 'large'
    />
  );
}
```

## Component API

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| onRecordingStart | () => void | Yes | - | Callback fired when recording starts |
| onRecordingStop | (audioBlob: Blob) => Promise<void> | Yes | - | Callback fired when recording stops |
| position | 'top-right' \| 'middle-right' \| 'bottom-right' | No | 'middle-right' | Position of the floating button |
| showAudioLevel | boolean | No | true | Whether to show audio level visualization |
| size | 'small' \| 'medium' \| 'large' | No | 'medium' | Size of the button |
| disabled | boolean | No | false | Disable the button |
| className | string | No | - | Additional CSS classes |

### Hook API

```tsx
const {
  isRecording,
  startRecording,
  stopRecording,
  hasPermission,
  audioLevel,
  error
} = usePushToTalk({
  onRecordingStart,
  onRecordingStop
});
```

### Return Values

| Value | Type | Description |
|-------|------|-------------|
| isRecording | boolean | Whether recording is active |
| startRecording | () => void | Start recording |
| stopRecording | () => void | Stop recording |
| hasPermission | boolean | Whether microphone permission is granted |
| audioLevel | number | Current audio level (0-1) |
| error | Error \| null | Any recording or transcription errors |

## Styling

The component uses CSS variables for easy customization:

```css
:root {
  --ptt-button-bg: hsl(var(--primary));
  --ptt-button-hover: hsl(var(--primary-hover));
  --ptt-recording-color: hsl(var(--destructive));
  --ptt-disabled-bg: hsl(var(--muted));
  --ptt-shadow: var(--shadow-lg);
}
```

## Accessibility

- ARIA labels and roles
- Keyboard support (space bar)
- Visual feedback
- Screen reader announcements for recording states
- Focus management

## Mobile Support

- Touch events
- Haptic feedback
- Permission handling
- Battery-efficient audio processing
- Responsive positioning

## Implementation Details

### Audio Recording and Transcription

- Uses Web Audio API for high-quality recording
- Implements audio worklet for efficient audio level monitoring
- Handles various audio formats (WebM, MP3)
- Manages audio stream cleanup
- Automatic transcription using OpenAI Whisper API
- Transcription included in message content

### State Management

- Tracks recording state
- Handles permission state
- Manages audio level updates
- Error state handling
- Transcription state management

### Performance

- Efficient audio processing
- Minimal re-renders
- Memory leak prevention
- Proper cleanup on unmount
- Optimized transcription pipeline

## Example Implementation

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PushToTalk({
  onRecordingStart,
  onRecordingStop,
  position = 'middle-right',
  showAudioLevel = true,
  size = 'medium'
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // ... recording and transcription logic ...

  return (
    <button
      className={cn(
        'fixed z-50 rounded-full shadow-lg transition-all duration-200',
        'hover:bg-primary/90 focus:outline-none focus:ring-2',
        isRecording && 'animate-pulse bg-destructive',
        isTranscribing && 'opacity-50',
        positionClasses[position],
        sizeClasses[size]
      )}
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      disabled={isTranscribing}
    >
      <Mic className={cn('text-white', sizeIconClasses[size])} />
      {showAudioLevel && isRecording && (
        <div 
          className="absolute inset-0 rounded-full bg-white/20"
          style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
        />
      )}
    </button>
  );
}
``` 