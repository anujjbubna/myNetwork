# myNetwork

A personal relationship journal — track the people in your life, log interactions through natural-language chat, and get thoughtful nudges to stay connected.

Mobile-first **Progressive Web App** (installable on your phone's home screen) built with Next.js, Postgres, and Claude.

## Features

- **Chat (landing page)** — log interactions by typing or speaking; search your network ("who did I have ice cream with?", "close friends"); get recommendations
- **Dashboard** — top 5 most-interacted people, 5 people to reconnect with (30+ days), daily AI nudges
- **Person profiles** — closeness rating, tags (Family / Friend / Acquaintance / Business), likes/dislikes, highlights, relationship summary, interaction timeline
- **PIN lock** — simple auth gate for a single-user app on the public internet

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL (local or [Neon](https://neon.tech) free tier)

### Setup

```bash
npm install

# Copy env template and fill in values
cp .env.example .env

# Create the database (local Postgres example)
createdb mynetwork

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default PIN is whatever you set in `APP_PIN` (see `.env.example`).

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `APP_PIN` | 4–8 digit PIN to unlock the app |
| `AUTH_SECRET` | Random string used to sign the auth cookie |
| `ANTHROPIC_API_KEY` | Required for chat, nudges, and relationship summaries |

Optional: `CHAT_MODEL` (default `claude-sonnet-4-5`), `LIGHT_MODEL` (default `claude-haiku-4-5`).

## Deploy to Vercel + Neon

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial myNetwork app"
git push -u origin main
```

### 2. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project and copy the **pooled** connection string
3. It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 3. Deploy on Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `APP_PIN` | Your chosen PIN (change from default!) |
   | `AUTH_SECRET` | Long random string (`openssl rand -hex 32`) |
   | `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |

3. Deploy — the build runs `prisma migrate deploy` automatically

### 4. Install on your phone (PWA)

1. Open your Vercel URL in Safari (iOS) or Chrome (Android)
2. Enter your PIN
3. **iOS:** Share → Add to Home Screen
4. **Android:** Menu → Install app / Add to Home Screen

The app runs standalone with your warm theme and bottom navigation.

## Project structure

```
src/
  app/
    page.tsx          # Chat (landing)
    dashboard/        # Dashboard with carousels + nudges
    people/[id]/      # Person profile
    api/              # REST + chat endpoints
  components/         # UI components
  lib/
    ai.ts             # Claude helpers (summaries, nudges)
    interactions.ts   # Interaction logging
    prisma.ts         # Database client
prisma/schema.prisma  # Data model
public/sw.js          # Service worker for PWA
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build (includes DB migrations) |
| `npm run db:migrate` | Create/apply migrations in dev |
| `npm run db:studio` | Open Prisma Studio |
| `npm run icons` | Regenerate PWA icons |
