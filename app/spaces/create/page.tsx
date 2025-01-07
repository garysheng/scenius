'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { spacesService } from '@/lib/services/client/spaces';
import { X } from 'lucide-react';
import { accessControlService } from '@/lib/services/client/access-control';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSpaceSchema } from '@/lib/schemas/create-space';
import Image from 'next/image';

type CreateSpaceFormValues = {
  name: string;
  description: string;
  avatarUrl: string | null;
  settings: {
    isPublic: boolean;
    allowGuests: boolean;
    defaultRoleId: string;
  };
};

export default function CreateSpacePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
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
      }
    },
    resolver: zodResolver(createSpaceSchema)
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleAddDomain = () => {
    if (!newDomain) return;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain)) {
      setError('Please enter a valid domain');
      return;
    }

    if (domains.includes(newDomain)) {
      setError('Domain already added');
      return;
    }

    setDomains([...domains, newDomain]);
    setNewDomain('');
    setError(null);
  };

  const handleRemoveDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: CreateSpaceFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create the space first
      const spaceId = await spacesService.createSpace({
        ...data,
        avatarUrl: null // We'll update this after space creation
      });

      // Upload image if one was selected
      if (imageFile) {
        const avatarUrl = await spacesService.uploadSpaceImage(spaceId, imageFile);
        await spacesService.updateSpace(spaceId, { avatarUrl });
      }

      // Set up access control in the subcollection if domains are specified
      if (domains.length > 0) {
        await accessControlService.updateSpaceAccess(spaceId, {
          domains: domains
        });
      }

      router.push(`/spaces/${spaceId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
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
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Space profile picture"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image
                          src="/images/space-placeholder.svg"
                          alt="Space profile picture placeholder"
                          width={32}
                          height={32}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cosmic-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Square image, at least 256x256px
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Space Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  className="cosmic-input"
                  placeholder="Enter space name (min. 5 characters)"
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
                  placeholder="Describe your space (min. 8 characters)"
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Domain Whitelist</Label>
                      <p className="text-sm text-muted-foreground">
                        Add domains to restrict access to specific email domains
                      </p>
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter domain (e.g., company.com)"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDomain();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddDomain}>
                          Add
                        </Button>
                      </div>
                    </div>

                    {domains.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Domains</Label>
                        <div className="flex flex-wrap gap-2">
                          {domains.map((domain) => (
                            <div
                              key={domain}
                              className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                            >
                              {domain}
                              <button
                                type="button"
                                onClick={() => handleRemoveDomain(domain)}
                                className="text-primary hover:text-primary/80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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