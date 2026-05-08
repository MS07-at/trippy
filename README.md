# Trippy

A collaborative trip planning app for groups. Create vacation plans, propose destinations, vote on where to go, compare accommodations, discover activities, and coordinate travel — all in real time.

## Features

- **Group trip planning** — create trips with name, description, duration, and group size
- **Destination voting** — propose cities and vote as a group with upvote/downvote
- **Accommodation comparison** — add apartments with prices, links, photos, and notes
- **Travel options** — compare flights, trains, and car travel with cost estimates
- **Activity discovery** — AI-generated activity suggestions categorized by type
- **AI-powered descriptions** — auto-generate destination overviews
- **Image search** — find destination photos and extract images from booking listings
- **Sharing** — invite others via link or email; toggle public editing for open collaboration
- **Real-time sync** — all changes update instantly for every participant

## Tech Stack

- [Next.js 16](https://nextjs.org) with App Router and Turbopack
- [React 19](https://react.dev)
- [Convex](https://convex.dev) for the backend (database, file storage, real-time sync)
- [Vercel AI SDK](https://sdk.vercel.ai) + OpenAI for AI features
- [Tailwind CSS 4](https://tailwindcss.com)
- [shablon](https://app.shablon.eu) for transactional emails (MJML templates)
- [Puppeteer](https://pptr.dev) for image extraction
- TypeScript throughout

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io)
- A [Convex](https://convex.dev) account (free tier available)
- An OpenAI-compatible API key for AI features

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/trippy.git
cd trippy
pnpm install
```

### 2. Set up Convex

Create a new Convex project at [dashboard.convex.dev](https://dashboard.convex.dev) and note your deployment URL.

### 3. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Your Convex deployment identifier (e.g. `dev:your-project-123`) |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex cloud URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Your Convex site URL |
| `AI_GATEWAY_API_KEY` | API key for an OpenAI-compatible endpoint (used for descriptions and activity generation) |
| `SHABLON_API_KEY` | API key for [shablon](https://app.shablon.eu) (transactional email service) |
| `SHABLON_FROM_EMAIL` | Sender email address for outgoing emails |
| `SHABLON_ENVIRONMENT` | shablon environment (e.g. `production`) |
| `CHROMIUM_PATH` | Path to a Chromium/Chrome binary (for image extraction, e.g. `/usr/bin/chromium-browser`) |

### 4. Run the development server

```bash
pnpm dev
```

This starts both the Convex dev backend and the Next.js dev server with Turbopack. Open [http://localhost:3000](http://localhost:3000) to use the app.

### 5. Deploy

```bash
pnpm build
```

This deploys the Convex backend and builds the Next.js app for production.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # AI generation, image search, sharing endpoints
│   ├── trip/[slug]/        # Dynamic trip page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
└── lib/                    # Auth, Convex provider, utilities
convex/
├── schema.ts               # Database schema
├── vacations.ts            # Trip CRUD
├── destinations.ts         # Destination management
├── apartments.ts           # Accommodation management
├── activities.ts           # Activity management
├── travelOptions.ts        # Travel option management
├── votes.ts                # Voting system
├── users.ts                # Authentication
└── files.ts                # File/image storage
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Convex + Next.js dev servers |
| `pnpm build` | Deploy Convex and build for production |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |

## License

MIT
