'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Space } from '@/types';
import { spacesService } from '@/lib/services/client/spaces';

type CreateSpaceFormValues = Omit<Space, 'id' | 'createdAt' | 'updatedAt' | 'metadata' | 'ownerId'>;

export default function CreateSpacePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<CreateSpaceFormValues>({
    defaultValues: {
      name: '',
      description: '',
      avatarUrl: null,
      settings: {
        isPublic: true,
        allowGuests: false,
        defaultRoleId: 'member'
      },
      accessControl: {
        type: 'CUSTOM',
        config: {},
        combineMethod: 'OR'
      }
    },
  });

  const onSubmit = async (data: CreateSpaceFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      const spaceId = await spacesService.createSpace(data);
      router.push(`/spaces/${spaceId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen cosmic-bg p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
            Create a New Space
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your community hub with custom access controls and settings
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="cosmic-card">
            <CardHeader>
              <h2 className="text-lg font-semibold">Basic Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Space Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  className="cosmic-input"
                  placeholder="Enter space name"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  className="cosmic-input min-h-[100px]"
                  placeholder="Describe your space"
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="cosmic-card">
            <CardHeader>
              <h2 className="text-lg font-semibold">Access Control</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full relative z-20">
                  <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
                  <TabsTrigger value="token" className="flex-1">Token Gate</TabsTrigger>
                  <TabsTrigger value="domain" className="flex-1">Domain</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between relative z-20">
                    <div className="space-y-0.5">
                      <Label htmlFor="isPublic">Public Space</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow anyone to join your space
                      </p>
                    </div>
                    <Switch
                      id="isPublic"
                      checked={form.watch('settings.isPublic')}
                      onCheckedChange={(checked) => form.setValue('settings.isPublic', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between relative z-20">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowGuests">Allow Guests</Label>
                      <p className="text-sm text-muted-foreground">
                        Let users preview content before joining
                      </p>
                    </div>
                    <Switch
                      id="allowGuests"
                      checked={form.watch('settings.allowGuests')}
                      onCheckedChange={(checked) => form.setValue('settings.allowGuests', checked)}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="token" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Token gating coming soon. This will allow you to restrict access based on token ownership.
                  </p>
                </TabsContent>
                
                <TabsContent value="domain" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Domain whitelisting coming soon. This will allow you to restrict access to specific email domains.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex justify-end gap-4 relative z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-secondary/50 hover:border-secondary text-secondary-foreground transition-all duration-300 glow-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 glow-primary"
            >
              {isLoading ? 'Creating...' : 'Create Space'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
} 