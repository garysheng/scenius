import { SpaceDetail } from '@/components/spaces/space-detail';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SpaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SpaceDetail id={id} />;
}
