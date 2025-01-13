'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { VectorIndexStatusFrontend } from '@/types/vector-search';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';

export default function VectorSearchAdmin() {
  const router = useRouter();
  const { user } = useAuth();
  const [spaceId, setSpaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexStatus, setIndexStatus] = useState<VectorIndexStatusFrontend[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check admin status
    const checkAdminStatus = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const auth = getAuth();
      const idTokenResult = await auth.currentUser?.getIdTokenResult();
      const isAdmin = idTokenResult?.claims?.admin === true;
      
      if (!isAdmin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
    };

    checkAdminStatus();
  }, [user, router]);

  useEffect(() => {
    // Only subscribe to status updates if user is admin
    if (!isAdmin) return;

    // Subscribe to vector index status updates
    const statusRef = collection(db, 'vectorIndexStatus');
    const statusQuery = query(
      statusRef,
      orderBy('lastIndexed', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(statusQuery, (snapshot) => {
      const statuses: VectorIndexStatusFrontend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        statuses.push({
          spaceId: doc.id,
          lastIndexed: data.lastIndexed.toDate(),
          totalMessages: data.totalMessages || 0,
          vectorizedMessages: data.vectorizedMessages || 0,
          status: data.status || 'idle',
          error: data.error,
          progress: data.progress || 0
        });
      });
      setIndexStatus(statuses);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleReindex = async (force: boolean = false) => {
    if (!spaceId) {
      setError('Please provide a space ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const functions = getFunctions();
      const reindexMessages = httpsCallable(functions, 'reindexMessages');
      
      const result = await reindexMessages({
        spaceId,
        force
      });

      console.log('Reindex started:', result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start reindexing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Vector Search Administration</CardTitle>
          <CardDescription>
            Manage vector search indexing for message content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <Input
                placeholder="Space ID"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => handleReindex(false)} 
                disabled={loading}
                variant="outline"
              >
                Index New Messages
              </Button>
              <Button 
                onClick={() => handleReindex(true)} 
                disabled={loading}
                variant="default"
              >
                Reindex All
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Indexing Status</h3>
              {indexStatus.map((status) => (
                <Card key={status.spaceId}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Space: {status.spaceId}</p>
                        <p className="text-sm text-muted-foreground">
                          Last indexed: {status.lastIndexed.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm">
                        Status: <span className="font-medium">{status.status}</span>
                      </div>
                    </div>

                    {status.status === 'indexing' && (
                      <div className="space-y-2">
                        <Progress value={status.progress} />
                        <p className="text-sm text-muted-foreground text-right">
                          {status.progress}%
                        </p>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-muted-foreground">
                      {status.vectorizedMessages} / {status.totalMessages} messages vectorized
                    </div>

                    {status.error && (
                      <div className="mt-2 text-sm text-destructive">
                        Error: {status.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {indexStatus.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No recent indexing activity
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 