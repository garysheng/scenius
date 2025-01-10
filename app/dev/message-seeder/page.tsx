'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { messageSeederService } from '@/lib/services/client/message-seeder';
import { Loader2 } from 'lucide-react';
import { useSpacesAndChannels } from '@/lib/hooks/use-spaces-and-channels';
import { useSpaceUsers } from '@/lib/hooks/use-space-users';
import { CONVERSATION_PRESETS } from '@/lib/config/conversation-presets';

interface Participant {
  id: string;
  userId: string;
  role: {
    description: string;
    traits: string;
  };
}

interface ConversationContext {
  topic: string;
  tone: 'casual' | 'formal' | 'technical';
  duration: 'short' | 'medium' | 'long';
  scenario: string;
}

export default function MessageSeederPage() {
  const { toast } = useToast();
  const { spaces, getChannelsForSpace, loading: loadingSpaces, error: spacesError } = useSpacesAndChannels();
  const [spaceId, setSpaceId] = useState<string>('');
  const [channelId, setChannelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', userId: '', role: { description: '', traits: '' } }
  ]);
  const [context, setContext] = useState<ConversationContext>({
    topic: '',
    tone: 'casual',
    duration: 'medium',
    scenario: ''
  });

  // Get channels for selected space
  const availableChannels = spaceId ? getChannelsForSpace(spaceId) : [];
  
  // Get users for selected space
  const { users, loading: loadingUsers, error: usersError } = useSpaceUsers(spaceId);

  const handlePresetSelect = (presetId: string) => {
    const preset = CONVERSATION_PRESETS[presetId];
    if (!preset) return;

    // Set context
    setContext(preset.context);

    // Set up participants with empty userIds but preset roles
    setParticipants(
      preset.participants.map((p, index) => ({
        id: String(index + 1),
        userId: '',
        role: {
          description: p.role,
          traits: p.traits
        }
      }))
    );

    toast({
      title: "Preset Loaded",
      description: `Loaded the "${preset.name}" preset. Please select users for each role.`
    });
  };

  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: String(participants.length + 1),
        userId: '',
        role: { description: '', traits: '' }
      }
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id: string, field: string, value: string) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        if (field === 'userId') return { ...p, userId: value };
        if (field === 'description') return { ...p, role: { ...p.role, description: value } };
        if (field === 'traits') return { ...p, role: { ...p.role, traits: value } };
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!spaceId || !channelId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a space and channel"
      });
      return;
    }

    if (participants.some(p => !p.userId || !p.role.description)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all participant details"
      });
      return;
    }

    if (!context.topic || !context.scenario) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide conversation topic and scenario"
      });
      return;
    }

    setIsLoading(true);
    setStatus('Starting message generation...');

    try {
      // Log the request
      console.log('Submitting message seed request:', {
        spaceId,
        channelId,
        participants,
        context
      });

      const messageCount = await messageSeederService.seedMessages({
        spaceId,
        channelId,
        participants,
        context
      });

      setStatus('Messages generated successfully!');
      toast({
        title: "Success",
        description: `Generated ${messageCount} messages successfully`
      });
    } catch (error) {
      console.error('Error generating messages:', error);
      setStatus('Failed to generate messages');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate messages"
      });
    } finally {
      // Clear status after a delay
      setTimeout(() => {
        setStatus('');
        setIsLoading(false);
      }, 2000);
    }
  };

  const handleReset = () => {
    setSpaceId('');
    setChannelId('');
    setParticipants([{ id: '1', userId: '', role: { description: '', traits: '' } }]);
    setContext({
      topic: '',
      tone: 'casual',
      duration: 'medium',
      scenario: ''
    });
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? (user.fullName || user.username) : 'Unnamed User';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Message Seeder</h1>
      
      {/* Preset Selection */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conversation Preset</h2>
          <Select onValueChange={handlePresetSelect}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a preset conversation" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONVERSATION_PRESETS).map(([id, preset]) => (
                <SelectItem key={id} value={id}>
                  <div>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-sm text-muted-foreground">{preset.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Space & Channel Selection */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Space & Channel</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="space">Space</Label>
              <Select value={spaceId} onValueChange={(value) => {
                setSpaceId(value);
                setChannelId(''); // Reset channel when space changes
                // Reset participants when space changes
                setParticipants([{ id: '1', userId: '', role: { description: '', traits: '' } }]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSpaces ? "Loading spaces..." : "Select a space"} />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map(space => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {spacesError && (
                <p className="text-sm text-destructive">{spacesError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select 
                value={channelId} 
                onValueChange={setChannelId}
                disabled={!spaceId || loadingSpaces}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!spaceId ? "Select a space first" : "Select a channel"} />
                </SelectTrigger>
                <SelectContent>
                  {availableChannels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Participant Selection */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Step 2: Participants</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Participants</Label>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <Select 
                      value={participant.userId} 
                      onValueChange={(value) => updateParticipant(participant.id, 'userId', value)}
                      disabled={!spaceId || loadingUsers}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={
                          !spaceId 
                            ? "Select a space first" 
                            : loadingUsers 
                              ? "Loading users..." 
                              : "Select user"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {participants.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => removeParticipant(participant.id)}
                      >
                        -
                      </Button>
                    )}
                    {participant.id === String(participants.length) && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={addParticipant}
                      >
                        +
                      </Button>
                    )}
                  </div>
                ))}
                {usersError && (
                  <p className="text-sm text-destructive">{usersError}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Conversation Context */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Step 3: Context</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input 
                id="topic" 
                placeholder="Enter conversation topic"
                value={context.topic}
                onChange={(e) => setContext({ ...context, topic: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={context.tone} onValueChange={(value: 'casual' | 'formal' | 'technical') => setContext({ ...context, tone: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={context.duration} onValueChange={(value: 'short' | 'medium' | 'long') => setContext({ ...context, duration: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Participant Roles */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold">Step 4: Participant Roles</h2>
          
          <div className="space-y-4">
            {participants.map((participant) => (
              <div key={participant.id} className="space-y-2">
                <Label>Role for {getUserDisplayName(participant.userId)}</Label>
                <Textarea 
                  placeholder="Describe this participant's role in the conversation..."
                  className="h-24"
                  value={participant.role.description}
                  onChange={(e) => updateParticipant(participant.id, 'description', e.target.value)}
                />
                <Input 
                  placeholder="Traits (comma-separated)"
                  className="mt-2"
                  value={participant.role.traits}
                  onChange={(e) => updateParticipant(participant.id, 'traits', e.target.value)}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Scenario Description */}
      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Step 5: Scenario</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scenario">Detailed Scenario Description</Label>
            <Textarea 
              id="scenario"
              placeholder="Describe the conversation scenario in detail..."
              className="h-32"
              value={context.scenario}
              onChange={(e) => setContext({ ...context, scenario: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons and Status */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {status && (
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{status}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>Reset</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Messages'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 