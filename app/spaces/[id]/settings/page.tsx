import { SettingsView } from '@/components/spaces/settings-view';
import { TwinklingStars } from '@/components/effects/twinkling-stars';
import { CursorStars } from '@/components/effects/cursor-stars';

interface SettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  return (
    <>
      <TwinklingStars />
      <CursorStars />
      <SettingsView spaceId={id} />
    </>
  );
} 