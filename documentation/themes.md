# Scenius Theming System

## Overview

Scenius uses a lunarpunk-inspired dark theme that emphasizes futuristic optimism, celestial aesthetics, and AI interaction. The design system creates an immersive space-age experience with neon accents, subtle glows, and cosmic gradients.

## Theme Structure

### Base Colors

Our color system draws inspiration from lunar landscapes and cosmic phenomena:

```css
:root {
  /* Cosmic Background Colors */
  --background: 230 25% 5%;      /* Deep space black with slight blue tint */
  --foreground: 220 60% 98%;     /* Starlight white */
  
  /* Elevation Levels (Lunar Surface) */
  --elevation-1: 230 25% 7%;     /* Lunar crater */
  --elevation-2: 230 25% 9%;     /* Lunar highland */
  --elevation-3: 230 25% 11%;    /* Lunar peak */
  
  /* AI Elements (Aurora Borealis) */
  --ai-primary: 266 100% 50%;    /* Vibrant purple */
  --ai-secondary: 280 100% 65%;  /* Soft lilac */
  --ai-glow: 266 100% 65%;      /* Purple glow */
  
  /* Human Elements (Celestial Blue) */
  --human-primary: 200 100% 50%; /* Electric blue */
  --human-secondary: 190 100% 65%; /* Soft cyan */
  --human-glow: 200 100% 65%;    /* Blue glow */
  
  /* Accent Colors (Cosmic Phenomena) */
  --accent-nebula: 280 100% 65%; /* Nebula pink */
  --accent-aurora: 170 100% 65%; /* Aurora green */
  --accent-solar: 35 100% 65%;   /* Solar flare */
  
  /* Functional Colors */
  --success: 142 100% 65%;       /* Positive actions */
  --warning: 38 100% 65%;        /* Caution */
  --destructive: 0 100% 65%;     /* Danger */
  
  /* UI Elements */
  --border-dim: 230 25% 15%;     /* Subtle borders */
  --border-glow: 230 25% 25%;    /* Glowing borders */
  
  /* Text Colors */
  --text-primary: 220 60% 98%;   /* Primary text */
  --text-secondary: 220 30% 80%; /* Secondary text */
  --text-tertiary: 220 20% 65%;  /* Tertiary text */
}
```

### Shadows & Glows

```css
/* Neon glow mixins */
.glow-ai {
  box-shadow: 0 0 10px hsl(var(--ai-glow) / 0.5),
              0 0 20px hsl(var(--ai-glow) / 0.3);
}

.glow-human {
  box-shadow: 0 0 10px hsl(var(--human-glow) / 0.5),
              0 0 20px hsl(var(--human-glow) / 0.3);
}

/* Cosmic background effect */
.cosmic-bg {
  background: linear-gradient(
    45deg,
    hsl(var(--background)),
    hsl(230 25% 7%),
    hsl(240 25% 8%)
  );
  background-size: 200% 200%;
  animation: cosmic-pulse 15s ease infinite;
}

@keyframes cosmic-pulse {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

## Components

### AI Message Bubbles
```tsx
const AIMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="relative group">
    <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--ai-primary))] to-[hsl(var(--ai-secondary))] rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000" />
    <div className="relative bg-[hsl(var(--elevation-2))] rounded-lg p-4 ring-1 ring-[hsl(var(--border-glow))]">
      <div className="text-[hsl(var(--text-primary))]">
        {children}
      </div>
    </div>
  </div>
);
```

### Space Cards
```tsx
const SpaceCard = ({ title, description }: { title: string; description: string }) => (
  <div className="group relative">
    <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--accent-nebula))] to-[hsl(var(--accent-aurora))] rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000" />
    <div className="relative bg-[hsl(var(--elevation-1))] rounded-lg p-6 ring-1 ring-[hsl(var(--border-dim))] hover:ring-[hsl(var(--border-glow))] transition-all duration-300">
      <h3 className="text-lg font-semibold text-[hsl(var(--text-primary))]">
        {title}
      </h3>
      <p className="mt-2 text-[hsl(var(--text-secondary))]">
        {description}
      </p>
    </div>
  </div>
);
```

### Interactive Elements

```tsx
// Neon Button
const NeonButton = ({ variant = 'ai', children }: { variant: 'ai' | 'human', children: React.ReactNode }) => (
  <button
    className={cn(
      "relative px-6 py-2 rounded-lg transition-all duration-300",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:rounded-lg before:blur-sm before:opacity-75 before:transition-opacity",
      variant === 'ai'
        ? "before:from-[hsl(var(--ai-primary))] before:to-[hsl(var(--ai-secondary))] hover:before:opacity-100"
        : "before:from-[hsl(var(--human-primary))] before:to-[hsl(var(--human-secondary))] hover:before:opacity-100",
      "bg-[hsl(var(--elevation-2))]",
      "text-[hsl(var(--text-primary))]"
    )}
  >
    <span className="relative z-10">{children}</span>
  </button>
);

// Cosmic Input
const CosmicInput = () => (
  <div className="relative">
    <input
      className={cn(
        "w-full px-4 py-2 rounded-lg",
        "bg-[hsl(var(--elevation-1))]",
        "text-[hsl(var(--text-primary))]",
        "ring-1 ring-[hsl(var(--border-dim))]",
        "focus:ring-[hsl(var(--border-glow))]",
        "focus:outline-none focus:ring-2",
        "transition-all duration-300"
      )}
    />
    <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent-nebula))] to-[hsl(var(--accent-aurora))] rounded-lg blur opacity-0 transition-opacity duration-300 -z-10 peer-focus:opacity-25" />
  </div>
);
```

### Animation States

```css
/* AI Processing Animation */
.ai-processing {
  @apply relative overflow-hidden;
  &:after {
    content: '';
    @apply absolute inset-0;
    background: linear-gradient(
      90deg,
      transparent,
      hsl(var(--ai-glow) / 0.2),
      transparent
    );
    animation: ai-processing 1.5s infinite;
  }
}

@keyframes ai-processing {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Cosmic Background Pulse */
.cosmic-pulse {
  animation: cosmic-pulse 4s ease infinite;
  background: linear-gradient(
    45deg,
    hsl(var(--background)),
    hsl(var(--elevation-2)),
    hsl(var(--background))
  );
  background-size: 200% 200%;
}
```

## Best Practices

1. **Neon Effects**
   - Use glows sparingly to maintain visual hierarchy
   - Increase glow intensity on hover/focus states
   - Combine multiple layers of glow for depth

2. **Cosmic Gradients**
   - Use subtle gradients for backgrounds
   - Animate gradients slowly for ambient effect
   - Layer gradients with noise textures

3. **AI vs Human Elements**
   - AI elements use purple/violet spectrum
   - Human elements use blue/cyan spectrum
   - Maintain consistent glow colors

4. **Animation Guidelines**
   - Keep animations smooth and subtle
   - Use longer durations for ambient effects
   - Quick transitions for interactive elements

## Performance Considerations

1. **Glow Effects**
   - Use `backdrop-filter` when possible
   - Limit number of layered glows
   - Consider reducing effects on mobile

2. **Gradient Animations**
   - Use hardware-accelerated properties
   - Implement `will-change` appropriately
   - Reduce animation complexity on lower-end devices

## Future Enhancements

1. **Interactive Elements**
   - Particle effects for AI processing
   - Constellation-like connecting lines
   - Aurora-inspired loading states

2. **3D Effects**
   - Subtle parallax on cards
   - Depth-based glow intensity
   - 3D transformations on hover

3. **Audio-Visual Sync**
   - Glow pulses with voice input
   - Reactive backgrounds to ambient sound
   - Visual feedback for voice commands 