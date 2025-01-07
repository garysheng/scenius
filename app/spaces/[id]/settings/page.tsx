import { SettingsView } from '@/components/spaces/settings-view';

interface SettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  return <SettingsView spaceId={id} />;
} 