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
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSpacesAndChannels } from '@/lib/hooks/use-spaces-and-channels';
import { useSpaceUsers } from '@/lib/hooks/use-space-users';
import { CONVERSATION_PRESETS } from '@/lib/config/conversation-presets';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  userId: string;
  role: {
    description: string;
    traits: string;
  };
}

interface ConversationContext {
  scenario: string;
  duration: 'short' | 'medium' | 'long';
}

type Step = 'space' | 'participants' | 'context' | 'review';

export default function MessageSeederPage() {
  const { toast } = useToast();
  const { spaces, getChannelsForSpace, loading: loadingSpaces } = useSpacesAndChannels();
  const [currentStep, setCurrentStep] = useState<Step>('space');
  const [spaceId, setSpaceId] = useState<string>('');
  const [channelId, setChannelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', userId: '', role: { description: '', traits: '' } }
  ]);
  const [context, setContext] = useState<ConversationContext>({
    scenario: '',
    duration: 'medium'
  });

  // Get channels for selected space
  const availableChannels = spaceId ? getChannelsForSpace(spaceId) : [];
  
  // Get users for selected space
  const { users, loading: loadingUsers } = useSpaceUsers(spaceId);

  const handlePresetSelect = (presetId: string) => {
    const preset = CONVERSATION_PRESETS[presetId];
    if (!preset) return;

    setContext({
      scenario: preset.context.scenario,
      duration: preset.context.duration
    });
    
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
        if (field === 'userId') {
          const user = users.find(u => u.id === value);
          const userName = user ? (user.fullName || user.username) : 'Unnamed User';
          const spaceName = spaces.find(s => s.id === spaceId)?.name || 'the space';
          const channelName = availableChannels.find(c => c.id === channelId)?.name || 'the channel';
          
          return {
            ...p,
            userId: value,
            role: {
              ...p.role,
              description: p.role.description || `You are ${userName} in the ${spaceName} space in the ${channelName} channel of a slack-like workspace`
            }
          };
        }
        if (field === 'description') return { ...p, role: { ...p.role, description: value } };
        if (field === 'traits') return { ...p, role: { ...p.role, traits: value } };
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setStatus('Starting message generation...');

    try {
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
      scenario: '',
      duration: 'medium'
    });
    setCurrentStep('space');
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? (user.fullName || user.username) : 'Unnamed User';
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'space':
        return spaceId && channelId;
      case 'participants':
        return participants.every(p => p.userId && p.role.description);
      case 'context':
        return context.scenario;
      case 'review':
        return true;
    }
  };

  const nextStep = () => {
    if (!canProceed()) {
      toast({
        variant: "destructive",
        title: "Cannot Proceed",
        description: "Please fill in all required fields"
      });
      return;
    }

    switch (currentStep) {
      case 'space':
        setCurrentStep('participants');
        break;
      case 'participants':
        setCurrentStep('context');
        break;
      case 'context':
        setCurrentStep('review');
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'participants':
        setCurrentStep('space');
        break;
      case 'context':
        setCurrentStep('participants');
        break;
      case 'review':
        setCurrentStep('context');
        break;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Message Seeder</h1>
        <Button variant="ghost" onClick={handleReset}>Reset</Button>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2" />
        {(['space', 'participants', 'context', 'review'] as Step[]).map((step, index) => (
          <div key={step} className="relative flex items-center">
            <div 
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-medium transition-colors relative z-10",
                currentStep === step 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : index < ['space', 'participants', 'context', 'review'].indexOf(currentStep)
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      <Card className="p-6">
        {/* Step 1: Space & Channel Selection */}
        {currentStep === 'space' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 1: Select Space & Channel</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="space">Space</Label>
                <Select value={spaceId} onValueChange={(value) => {
                  setSpaceId(value);
                  setChannelId('');
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select value={channelId} onValueChange={setChannelId} disabled={!spaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
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
          </div>
        )}

        {/* Step 2: Participant Selection */}
        {currentStep === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Step 2: Configure Participants</h2>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Load a preset" />
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

            <div className="space-y-4">
              {participants.map((participant, index) => (
                <div key={participant.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Participant {index + 1}</h3>
                    {participants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipant(participant.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select
                      value={participant.userId}
                      onValueChange={(value) => updateParticipant(participant.id, 'userId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user"} />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role Description</Label>
                    <Textarea
                      value={participant.role.description}
                      onChange={(e) => updateParticipant(participant.id, 'description', e.target.value)}
                      placeholder={participant.userId ? 
                        `You are ${getUserDisplayName(participant.userId)} in the ${spaces.find(s => s.id === spaceId)?.name || 'the space'} space in the ${availableChannels.find(c => c.id === channelId)?.name || 'the channel'} channel of a slack-like workspace` :
                        "First select a user, then describe their role in the conversation..."
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Traits</Label>
                    <Input
                      value={participant.role.traits}
                      onChange={(e) => updateParticipant(participant.id, 'traits', e.target.value)}
                      placeholder={participant.userId ? 
                        `e.g., friendly, technical, curious - personality traits for ${getUserDisplayName(participant.userId)}` :
                        "First select a user, then list their personality traits..."
                      }
                    />
                  </div>
                </div>
              ))}

              <Button onClick={addParticipant} variant="outline" className="w-full">
                Add Participant
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Context Configuration */}
        {currentStep === 'context' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 3: Configure Context</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Context</Label>
                <Textarea
                  value={context.scenario}
                  onChange={(e) => setContext({ ...context, scenario: e.target.value })}
                  placeholder="Describe the scenario and context for this conversation..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={context.duration}
                  onValueChange={(value: 'short' | 'medium' | 'long') => 
                    setContext({ ...context, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (5-10 messages)</SelectItem>
                    <SelectItem value="medium">Medium (10-20 messages)</SelectItem>
                    <SelectItem value="long">Long (20-30 messages)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Step 4: Review & Generate</h2>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-medium">Space & Channel</h3>
                <p>Space: {spaces.find(s => s.id === spaceId)?.name}</p>
                <p>Channel: {availableChannels.find(c => c.id === channelId)?.name}</p>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-medium">Participants</h3>
                {participants.map((p, i) => (
                  <div key={p.id} className="space-y-1">
                    <p className="font-medium">Participant {i + 1}</p>
                    <p>User: {getUserDisplayName(p.userId)}</p>
                    <p>Role: {p.role.description}</p>
                    <p>Traits: {p.role.traits}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h3 className="font-medium">Context</h3>
                <p>Context: {context.scenario}</p>
                <p>Duration: {context.duration}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {currentStep !== 'space' && (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="ml-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Messages'
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed() || isLoading}
              className="ml-auto"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>

      {status && (
        <div className="text-center text-sm text-muted-foreground">
          {status}
        </div>
      )}
    </div>
  );
} 