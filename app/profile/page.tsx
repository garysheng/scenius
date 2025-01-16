'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Pencil, Check, X, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersService } from '@/lib/services/client/users';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.fullName || '');
      setUsername(user.username || '');
      setAutoResponseEnabled(user.settings?.autoResponseEnabled || false);
    }
  }, [user]);

  const handleAutoResponseToggle = async (enabled: boolean) => {
    if (!user || isUpdating) return;

    try {
      setIsUpdating(true);
      setError(null);
      await usersService.updateUser(user.id, {
        settings: {
          ...user.settings,
          autoResponseEnabled: enabled
        }
      });
      setAutoResponseEnabled(enabled);
      toast({
        title: 'Settings updated',
        description: `Auto-response has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        });
      } else {
        setError('Failed to update auto-response settings');
        toast({
          title: 'Error',
          description: 'Failed to update auto-response settings',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || isUpdating) return;

    try {
      setIsUpdating(true);
      setError(null);
      await usersService.updateUser(user.id, {
        username,
        fullName: displayName,
      });
      setIsEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        });
      } else {
        setError('Failed to update profile');
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="bg-zinc-900 rounded-lg shadow-xl overflow-hidden border border-zinc-800">
          <div className="p-8">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName" className="text-zinc-200">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username" className="text-zinc-200">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
                        placeholder="Enter your username"
                      />
                    </div>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdating}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(user?.fullName || '');
                          setUsername(user?.username || '');
                        }}
                        variant="outline"
                        disabled={isUpdating}
                        className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <h1 className="text-2xl font-semibold text-zinc-200">
                      {user?.fullName || user?.username}
                    </h1>
                    {user?.fullName && (
                      <p className="text-zinc-400">
                        @{user?.username}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      disabled={isUpdating}
                      className="mt-2 border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>

              {/* Auto-response Settings Section */}
              <div className="mt-8 pt-8 border-t border-zinc-800 w-full">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-zinc-200">Auto-Response</h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Allow AI to automatically respond to direct messages with video responses
                    </p>
                  </div>
                  <Switch
                    checked={autoResponseEnabled}
                    onCheckedChange={handleAutoResponseToggle}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 