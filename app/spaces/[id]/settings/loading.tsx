import { LoadingStars } from '@/components/ui/loading-stars';

export default function SettingsLoading() {
  return (
    <main className="min-h-screen cosmic-bg">
      <div className="flex h-screen items-center justify-center">
        <LoadingStars size="lg" text="Loading settings..." />
      </div>
    </main>
  );
} 