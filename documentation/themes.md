# Scenius Theming System

## Overview

Scenius uses a lunarpunk-inspired dark theme that emphasizes futuristic optimism, celestial aesthetics, and AI interaction. The design system creates an immersive space-age experience with neon accents, subtle glows, and cosmic gradients.

## Theme Structure

### Base Colors

Our color system draws inspiration from lunar landscapes and cosmic phenomena:

```css
:root {
  /* Cosmic Background Colors */
  --background: 240 10% 4%;        /* Deep space black */
  --foreground: 0 0% 100%;         /* Pure white */
  
  /* Card & Surface Colors */
  --card: 240 10% 4%;              /* Matches background for consistency */
  --card-foreground: 0 0% 100%;    /* Pure white */
  --popover: 240 10% 4%;           /* Matches background */
  --popover-foreground: 0 0% 100%; /* Pure white */
  
  /* Primary Colors - Purple Theme */
  --primary: 267 100% 61%;         /* Main purple */
  --primary-foreground: 0 0% 100%; /* White text on primary */
  
  /* Secondary Colors - Cosmic Accent */
  --secondary: 280 91% 65%;        /* Lighter purple */
  --secondary-foreground: 0 0% 100%; /* White text on secondary */
  
  /* Muted Elements */
  --muted: 240 10% 8%;            /* Slightly lighter than background */
  --muted-foreground: 240 5% 65%; /* Subdued text */
  
  /* Accent Colors */
  --accent: 280 91% 65%;          /* Matches secondary for consistency */
  --accent-foreground: 0 0% 100%; /* White text on accent */
  --accent-nebula: 280 91% 65%;   /* Nebula effect color */
  
  /* AI Elements */
  --ai-primary: 267 100% 61%;     /* Matches primary */
  --ai-secondary: 280 91% 65%;    /* Matches secondary */
  
  /* Functional Colors */
  --destructive: 0 84% 60%;       /* Red for dangerous actions */
  --destructive-foreground: 0 0% 100%; /* White text on destructive */
  --border: 240 10% 8%;           /* Subtle borders */
  --input: 240 10% 8%;            /* Input backgrounds */
  --ring: 267 100% 61%;           /* Focus rings - matches primary */

  /* Chart Colors */
  --chart-1: 267 100% 61%;        /* Primary purple */
  --chart-2: 280 91% 65%;         /* Secondary purple */
  --chart-3: 230 100% 65%;        /* Blue accent */
  --chart-4: 170 100% 65%;        /* Cyan accent */
  --chart-5: 330 100% 65%;        /* Pink accent */
}
```

### Semantic Colors

```css
/* Message Types */
.message-ai {
  --message-bg: hsl(var(--ai-primary) / 0.1);
  --message-border: hsl(var(--ai-primary) / 0.2);
  --message-glow: hsl(var(--ai-primary) / 0.1);
}

.message-human {
  --message-bg: hsl(var(--muted));
  --message-border: hsl(var(--border));
  --message-glow: none;
}

/* Interactive States */
.interactive-hover {
  --hover-bg: hsl(var(--primary) / 0.1);
  --hover-border: hsl(var(--primary) / 0.2);
  --hover-glow: hsl(var(--primary) / 0.2);
}

/* Status Colors */
.status-online {
  --status-color: hsl(142 100% 65%);
}

.status-away {
  --status-color: hsl(38 100% 65%);
}

.status-offline {
  --status-color: hsl(var(--muted-foreground));
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