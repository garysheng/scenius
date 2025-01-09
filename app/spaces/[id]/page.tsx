import { Metadata } from 'next';
import { SpaceDetail } from '@/components/spaces/space-detail';
import { spacesService } from '@/lib/services/client/spaces';
import { urlService } from '@/lib/services/client/url';
import { getAuth } from 'firebase/auth';
import { ChannelProvider } from '@/lib/contexts/channel-context';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const auth = getAuth();

  // Default metadata for unauthenticated users or error cases
  const defaultMetadata: Metadata = {
    title: 'Join Space | Scenius',
    description: 'Join a community on Scenius',
    openGraph: {
      title: 'Join Space | Scenius',
      description: 'Join a community on Scenius',
      type: 'website',
      url: urlService.spaces.detail(id),
      siteName: 'Scenius',
      images: [
        {
          url: '/share.png',
          width: 1200,
          height: 630,
          alt: 'Scenius - Join Space'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Join Space | Scenius',
      description: 'Join a community on Scenius',
      images: ['/share.png']
    }
  };

  try {
    // Only attempt to fetch space data if user is authenticated
    if (auth.currentUser) {
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
              url: space.avatarUrl || '/share.png',
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
          images: [space.avatarUrl || '/share.png']
        }
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }

  return defaultMetadata;
}

export default async function SpaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <ChannelProvider>
      <SpaceDetail id={id} />
    </ChannelProvider>
  );
}
