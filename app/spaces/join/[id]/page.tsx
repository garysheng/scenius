import { JoinSpaceClient } from '@/components/spaces/join-space-client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JoinSpacePage({ params }: PageProps) {
  const { id } = await params;
  return <JoinSpaceClient id={id} />;
}