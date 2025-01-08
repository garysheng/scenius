'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { spacesService } from '@/lib/services/client/spaces';
import { X } from 'lucide-react';
import { accessControlService } from '@/lib/services/client/access-control';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSpaceSchema } from '@/lib/schemas/create-space';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

type CreateSpaceFormValues = {
  name: string;
  description: string;
  avatarUrl: string | null;
  settings: {
    isOpen: boolean;
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
        isOpen: true,
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

      // Set up access control in the subcollection
      await accessControlService.updateSpaceAccess(spaceId, {
        isOpen: data.settings.isOpen,
        domains: domains,
        emailList: {
          enabled: false,
          emails: []
        },
        inviteLinks: []
      });

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
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Type</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose who can access your space
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="open"
                      name="accessType"
                      className="mt-1"
                      checked={form.watch('settings.isOpen')}
                      onChange={() => {
                        form.setValue('settings.isOpen', true);
                        setDomains([]);
                      }}
                    />
                    <div>
                      <Label htmlFor="open" className="text-base font-medium">Open Space</Label>
                      <p className="text-sm text-muted-foreground">
                        Anyone can join your space. Best for public communities and open collaboration.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="domain"
                      name="accessType"
                      className="mt-1"
                      checked={!form.watch('settings.isOpen')}
                      onChange={() => {
                        form.setValue('settings.isOpen', false);
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor="domain" className="text-base font-medium">Domain Gated</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Only users with specific email domains can join. Best for organizations and private communities.
                      </p>

                      {!form.watch('settings.isOpen') && (
                        <div className="space-y-4">
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

                          {domains.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {domains.map((domain) => (
                                  <Badge
                                    key={domain}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    {domain}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-transparent"
                                      onClick={() => handleRemoveDomain(domain)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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