'use client';

import { useState } from 'react';
import { useAccessControl } from '@/lib/hooks/use-access-control';
import { SpaceAccess } from '@/types/access-control';
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
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Link as LinkIcon,
  Mail,
  Globe,
  Shield,
} from 'lucide-react';
import { urlService } from '@/lib/services/client/url';

interface AccessControlSettingsProps {
  spaceId: string;
}

export function AccessControlSettings({ spaceId }: AccessControlSettingsProps) {
  const {
    loading,
    error,
    accessConfig,
    updateAccess,
    addEmailToList,
    removeEmailFromList,
    verifyDomain,
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
    return <div>Loading access control settings...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const handleEmailListToggle = async (enabled: boolean) => {
    await updateAccess({
      emailList: {
        ...accessConfig?.emailList,
        enabled,
        emails: accessConfig?.emailList.emails || []
      }
    });
  };

  const handleDomainAccessToggle = async (enabled: boolean) => {
    await updateAccess({
      domains: {
        ...accessConfig?.domains,
        enabled,
        domains: accessConfig?.domains.domains || []
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

    const domain = {
      domain: newDomain.toLowerCase(),
      verified: false,
      allowSubdomains: false
    };

    await updateAccess({
      domains: {
        enabled: true,
        domains: [...(accessConfig?.domains?.domains || []), domain]
      }
    });

    setNewDomain('');
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


  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Access Control Settings</CardTitle>
          <CardDescription>
            Manage who can access your space and what they can do
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email-list">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="email-list">
                <Mail className="w-4 h-4 mr-2" />
                Email List
              </TabsTrigger>
              <TabsTrigger value="domains">
                <Globe className="w-4 h-4 mr-2" />
                Domains
              </TabsTrigger>
              <TabsTrigger value="invites">
                <LinkIcon className="w-4 h-4 mr-2" />
                Invite Links
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Shield className="w-4 h-4 mr-2" />
                Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email-list">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Email List Access</CardTitle>
                    <Switch
                      checked={accessConfig?.emailList.enabled}
                      onCheckedChange={handleEmailListToggle}
                    />
                  </div>
                  <CardDescription>
                    Control access by specifying allowed email addresses
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domains">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Domain Access</CardTitle>
                    <Switch
                      checked={accessConfig?.domains.enabled}
                      onCheckedChange={handleDomainAccessToggle}
                    />
                  </div>
                  <CardDescription>
                    Allow access based on email domains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="space-y-2">
                        {accessConfig?.domains.domains.map((domain) => (
                          <div
                            key={domain.domain}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <span>{domain.domain}</span>
                              {domain.verified ? (
                                <Badge variant="default">
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Unverified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {!domain.verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => verifyDomain(domain.domain)}
                                >
                                  Verify
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement domain removal
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites">
              <Card>
                <CardHeader>
                  <CardTitle>Invite Links</CardTitle>
                  <CardDescription>
                    Create and manage invite links for your space
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Active Invite Links</h4>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        <div className="space-y-4">
                          {accessConfig?.inviteLinks?.map((link: SpaceAccess['inviteLinks'][0]) => (
                            <div
                              key={link.id}
                              className="flex items-center justify-between"
                            >
                              <div className="flex flex-col">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {link.code}
                                </code>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <span>{link.uses}/{link.maxUses || '∞'} uses</span>
                                  <span>•</span>
                                  <span>
                                    {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never expires'}
                                  </span>
                                  {link.isRevoked && (
                                    <>
                                      <span>•</span>
                                      <span className="text-destructive font-medium">Revoked</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const inviteUrl = urlService.invites.inviteWithDomain(link.code);
                                    navigator.clipboard.writeText(inviteUrl);
                                  }}
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </Button>
                                {!link.isRevoked && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => revokeInviteLink(link.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles">
              <Card>
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
        </CardContent>
      </Card>
    </>
  );
} 