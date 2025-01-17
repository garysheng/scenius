'use client';

import {
  Users,
  Shield,
  MessageSquare,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TwinklingStars } from '@/components/effects/twinkling-stars';
import { CursorStars } from '@/components/effects/cursor-stars';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  glowColor: string;
}

function FeatureCard({ title, description, icon: Icon, glowColor }: FeatureCardProps) {
  return (
    <div className="cosmic-card rounded-xl p-6 group relative">
      <div className={`absolute -inset-[1px] ${glowColor} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md`} />
      <div className="relative space-y-4">
        <div className="inline-block p-3 rounded-lg bg-black/50 ring-1 ring-white/10">
          <Icon className="w-6 h-6 text-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/signup');
  };

  const handleLearnMore = () => {
    // Smooth scroll to features section
    const featuresSection = document.querySelector('#features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="relative min-h-screen">
      <TwinklingStars />
      <CursorStars />
      {/* Star field background */}
      <div className="star-field animate-twinkle" />

      {/* Cosmic gradient overlays */}
      <div className="absolute inset-0">
        <div className="w-full h-full rotate-180 opacity-40 blur-3xl bg-gradient-to-b from-primary/30 via-accent/30 to-secondary/30 animate-pulse-slow" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-24 flex flex-col items-center justify-center gap-16">
        {/* Logo */}
        <div>
          <Image
            src="/logo.png"
            alt="Scenius Logo"
            width={128}
            height={128}
            className="animate-float"
          />
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-purple-400 to-white bg-clip-text text-transparent animate-gradient">
              Where Communities Thrive Together
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Scenius is a modern community platform that brings people together through rich conversations, voice messaging, and powerful collaboration tools.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 glow-primary"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLearnMore}
              className="border-secondary/50 hover:border-secondary text-secondary-foreground transition-all duration-300 glow-secondary"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
          <FeatureCard
            title="Vibrant Communities"
            description="Create spaces where people can connect, share ideas, and build meaningful relationships through text and voice conversations."
            icon={Users}
            glowColor="bg-gradient-to-r from-primary/50 to-accent/50"
          />
          <FeatureCard
            title="Rich Conversations"
            description="Express yourself naturally with voice messages, reactions, threads, and multimedia sharing in a beautiful, intuitive interface."
            icon={MessageSquare}
            glowColor="bg-gradient-to-r from-secondary/80 via-blue-500/80 to-primary/80"
          />
          <FeatureCard
            title="Flexible Access Control"
            description="Gate your community your way. Combine email domains, whitelists, and role-based permissions to create the perfect entry criteria."
            icon={Shield}
            glowColor="bg-gradient-to-r from-primary/80 via-indigo-500/80 to-accent/80"
          />
          <FeatureCard
            title="Collective Intelligence"
            description="Harness your community's knowledge with powerful organization tools. Surface insights and make better decisions together."
            icon={Brain}
            glowColor="bg-gradient-to-r from-accent/80 via-fuchsia-500/80 to-secondary/80"
          />
        </div>
      </div>
    </main>
  );
}
