# Scenius.Chat

A voice-first community platform where members earn points and tokens for valuable contributions, deploy blockchain-integrated AI agents, and communicate securely with voice anonymization - perfect for anon communities and DAOs.

## Features (Soon)

### 🎙️ Voice-First Experience
- Voice notes with privacy-preserving anonymization
- Real-time voice modulation and filters
- Client-side audio processing
- Perfect for anon contributors

### 🤖 Community Agents
- Deploy tokenized AI agents powered by Virtuals Protocol and elizaOS
- Represent your community across social platforms
- Revenue sharing for token holders
- AI-powered community insights

### 🏆 Points & Streaming Rewards
- Recognize valuable contributions with points
- Automatic token streaming to contributors
- Community-driven point awards
- Transparent reward distribution

### 🛡️ Flexible Access Control
- Token-gating support
- Email domain verification
- Whitelist management
- Guild.xyz integration
- Role-based permissions

### 🧠 Collective Intelligence
- AI-powered discussion organization
- Automated insight extraction
- Enhanced decision-making tools
- Knowledge base generation

## Tech Stack

- **Frontend**: Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Firestore, Storage, Auth)
- **AI/ML**: OpenAI GPT-4, Whisper ASR, TTS
- **Web3**: Virtuals Protocol, elizaOS integration
- **Voice Processing**: Client-side WebAudio API

## Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or yarn
- Firebase project with necessary services enabled
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/scenius.git
cd scenius
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
scenius/
├── app/                    # Next.js app directory
├── components/            # Reusable React components
├── lib/                   # Utility functions and services
│   ├── constants/        # Constants and configuration
│   ├── hooks/           # Custom React hooks
│   └── services/        # Firebase and API services
├── public/               # Static assets
├── styles/              # Global styles
├── types/               # TypeScript type definitions
└── documentation/       # Project documentation
```

## Documentation

- [Access Control System](/documentation/access-control.md)
- [Voice Anonymization](/documentation/voice-anonymization.md)
- [Community Agents](/documentation/agents.md)
- [Points System](/documentation/points.md)
- [API Reference](/documentation/api.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

