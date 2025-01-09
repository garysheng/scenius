'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ChannelFrontend } from '@/types';

interface ChannelContextType {
  selectedChannel: ChannelFrontend | null;
  setSelectedChannel: (channel: ChannelFrontend | null) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelFrontend | null>(null);

  return (
    <ChannelContext.Provider value={{ selectedChannel, setSelectedChannel }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  const context = useContext(ChannelContext);
  if (context === undefined) {
    throw new Error('useChannel must be used within a ChannelProvider');
  }
  return context;
} 