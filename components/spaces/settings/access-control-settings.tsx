'use client';

import { useState } from 'react';
import { useAccessControl } from '@/lib/hooks/use-access-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { urlService } from '@/lib/services/client/url';
import { LoadingStars } from '@/components/ui/loading-stars';
import {
  Plus,
  Trash2,
  Shield,
  Lock,
  Unlock,
  Copy,
} from 'lucide-react';

interface AccessControlSettingsProps {
  spaceId: string;
}

export function AccessControlSettings({ spaceId }: AccessControlSettingsProps) {
  const { toast } = useToast();
  const {
    loading,
    error,
    accessConfig,
    updateAccess,
    addEmailToList,
    removeEmailFromList,
    createInviteLink,
    revokeInviteLink,
    createRole,
  } = useAccessControl({ spaceId });

  const [newEmail, setNewEmail] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMaxUses, setInviteMaxUses] = useState<number | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#99AAB5');

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingStars size="md" text="Loading access control settings..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const handleAccessTypeChange = async (value: string) => {
    const isOpen = value === 'open';
    await updateAccess({
      isOpen,
      // Clear restricted access settings if switching to open
      ...(isOpen && {
        emailList: {
          enabled: false,
          emails: []
        },
        domains: [],
        inviteLinks: []
      })
    });
  };

  const handleEmailListToggle = async (enabled: boolean) => {
    await updateAccess({
      emailList: {
        ...accessConfig?.emailList,
        enabled,
        emails: accessConfig?.emailList.emails || []
      }
    });
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;
    await addEmailToList(newEmail);
    setNewEmail('');
  };

  const handleAddDomain = async () => {
    if (!newDomain) return;
    await updateAccess({
      domains: [...(accessConfig?.domains || []), newDomain.toLowerCase()]
    });
    setNewDomain('');
  };

  const handleRemoveDomain = async (domainToRemove: string) => {
    await updateAccess({
      domains: accessConfig?.domains.filter(domain => domain !== domainToRemove) || []
    });
  };

  const handleRevokeInvite = async (inviteId: string) => {
    await revokeInviteLink(inviteId);
  };

  const handleCreateInvite = async () => {
    await createInviteLink({
      assignedRole: inviteRole,
      maxUses: inviteMaxUses || undefined,
      expiresAt: inviteExpiry ? new Date(inviteExpiry) : undefined
    });

    // Reset form
    setInviteRole('member');
    setInviteMaxUses(null);
    setInviteExpiry('');
  };

  const handleCopyInviteLink = (code: string) => {
    navigator.clipboard.writeText(urlService.invites.inviteWithDomain(code));
    toast({
      description: 'Invite link copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="access">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="access">
            <Shield className="w-4 h-4 mr-2" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 mr-2" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access">
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <CardTitle>Access Type</CardTitle>
              <CardDescription>
                Choose how users can join your space
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={accessConfig?.isOpen ? 'open' : 'closed'}
                onValueChange={handleAccessTypeChange}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="open" id="open" className="mt-1" />
                  <div>
                    <Label htmlFor="open" className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Unlock className="w-4 h-4" />
                        Open Space
                      </div>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Anyone can join your space. Best for public communities and open collaboration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="closed" id="closed" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="closed" className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Restricted Access
                      </div>
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Control who can join through email lists, domains, or invite links.
                    </p>

                    {!accessConfig?.isOpen && (
                      <div className="pl-4 space-y-6">
                        {/* Email List Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium">Email List</h4>
                              <p className="text-sm text-muted-foreground">
                                Allow specific email addresses
                              </p>
                            </div>
                            <Switch
                              checked={accessConfig?.emailList.enabled}
                              onCheckedChange={handleEmailListToggle}
                            />
                          </div>

                          {accessConfig?.emailList.enabled && (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <Input
                                  placeholder="Enter email address"
                                  value={newEmail}
                                  onChange={(e) => setNewEmail(e.target.value)}
                                />
                                <Button onClick={handleAddEmail}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add
                                </Button>
                              </div>
                              <ScrollArea className="h-[100px] w-full rounded-md border p-4">
                                <div className="space-y-2">
                                  {accessConfig?.emailList.emails.map((email) => (
                                    <div
                                      key={email}
                                      className="flex items-center justify-between"
                                    >
                                      <span>{email}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeEmailFromList(email)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Domain Section */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium">Domain Access</h4>
                            <p className="text-sm text-muted-foreground">
                              Allow users with specific email domains
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Input
                              placeholder="Enter domain (e.g., company.com)"
                              value={newDomain}
                              onChange={(e) => setNewDomain(e.target.value)}
                            />
                            <Button onClick={handleAddDomain}>
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </Button>
                          </div>
                          <ScrollArea className="h-[100px] w-full rounded-md border p-4">
                            <div className="space-y-2">
                              {accessConfig?.domains?.map((domain) => (
                                <div
                                  key={domain}
                                  className="flex items-center justify-between"
                                >
                                  <span>{domain}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveDomain(domain)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        <Separator />

                        {/* Invite Links Section */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium">Invite Links</h4>
                            <p className="text-sm text-muted-foreground">
                              Create and manage invite links
                            </p>
                          </div>

                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label>Role</Label>
                              <Input
                                placeholder="Select role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Max Uses</Label>
                              <Input
                                type="number"
                                placeholder="Unlimited"
                                value={inviteMaxUses === null ? '' : inviteMaxUses}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setInviteMaxUses(value === '' ? null : Number(value));
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Expiry Date</Label>
                              <Input
                                type="datetime-local"
                                value={inviteExpiry}
                                onChange={(e) => setInviteExpiry(e.target.value)}
                              />
                            </div>
                            <Button onClick={handleCreateInvite}>
                              <Plus className="w-4 h-4 mr-2" />
                              Create Invite Link
                            </Button>
                          </div>

                          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                            <div className="space-y-4">
                              {accessConfig?.inviteLinks.map((invite) => (
                                <div
                                  key={invite.id}
                                  className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                                >
                                  <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <code className="text-xs bg-background px-1 py-0.5 rounded">
                                          {invite.code}
                                        </code>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 hover:bg-background"
                                          onClick={() => handleCopyInviteLink(invite.code)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="text-xs">
                                          {invite.useCount} / {invite.maxUses || '∞'} uses
                                        </Badge>
                                        {invite.expiresAt && (
                                          <Badge variant="outline" className="text-xs">
                                            Expires: {invite.expiresAt.toDate().toLocaleDateString()}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeInvite(invite.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Create and manage roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Create New Role</h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Role Name</Label>
                      <Input
                        placeholder="Enter role name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={newRoleColor}
                          onChange={(e) => setNewRoleColor(e.target.value)}
                          className="w-24 h-10 p-1"
                        />
                        <span className="text-sm text-muted-foreground">
                          {newRoleColor}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newRoleName) return;
                        await createRole({
                          name: newRoleName,
                          color: newRoleColor,
                          permissions: []
                        });
                        setNewRoleName('');
                        setNewRoleColor('#99AAB5');
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 