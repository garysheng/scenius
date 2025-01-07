'use client';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

interface EmojiData {
  native: string;
  id: string;
  name: string;
  unified: string;
  keywords: string[];
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const handleEmojiSelect = (emoji: EmojiData) => {
    console.log('EmojiPicker - emoji selected:', emoji);
    onEmojiSelect(emoji.native);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Picker
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        searchPosition="none"
        navPosition="none"
        perLine={8}
        maxFrequentRows={1}
        autoFocus
      />
    </div>
  );
} 