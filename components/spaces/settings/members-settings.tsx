'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { spacesService } from '@/lib/services/client/spaces';
import { Member } from '@/types/spaces';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface MembersSettingsProps {
  spaceId: string;
}

export function MembersSettings({ spaceId }: MembersSettingsProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const loadMembers = async () => {
      try {
        const spaceMembers = await spacesService.getSpaceMembers(spaceId);
        setMembers(spaceMembers);
      } catch (error) {
        console.error('Failed to load members:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadMembers();
    }
  }, [spaceId, user, authLoading, router]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user) return;

    try {
      await spacesService.inviteMember(spaceId, inviteEmail.trim());
      setInviteEmail('');
      // Reload members list
      const spaceMembers = await spacesService.getSpaceMembers(spaceId);
      setMembers(spaceMembers);
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!user) return;

    try {
      await spacesService.updateMemberRole(spaceId, memberId, newRole);
      // Reload members list
      const spaceMembers = await spacesService.getSpaceMembers(spaceId);
      setMembers(spaceMembers);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;

    try {
      await spacesService.removeMember(spaceId, memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email">Invite Members</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleInvite}>
            <Plus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>
      </div>

      {/* Members List */}
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === 'member' && (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role === 'admin' && (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                            Remove Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 