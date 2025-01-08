import { Metadata } from 'next';
import { SpaceDetail } from '@/components/spaces/space-detail';
import { spacesService } from '@/lib/services/client/spaces';
import { urlService } from '@/lib/services/client/url';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const space = await spacesService.getSpace(id);
    const title = `${space.name} | Scenius`;
    const description = space.description || `Join the conversation in ${space.name}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: urlService.spaces.detail(id),
        siteName: 'Scenius',
        images: [
          {
            url: space.imageUrl || '/share.png', // Fallback to default OG image
            width: 1200,
            height: 630,
            alt: space.name
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [space.imageUrl || '/share.png']
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Space | Scenius',
      description: 'Join the conversation on Scenius'
    };
  }
}

export default async function SpaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SpaceDetail id={id} />;
}
