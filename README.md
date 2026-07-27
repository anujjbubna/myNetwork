# myNetwork

A personal relationship journal — track the people in your life, log interactions through natural-language chat, and get thoughtful nudges to stay connected.

Mobile-first **Progressive Web App** (installable on your phone's home screen) built with Next.js, Postgres, and Claude.

## Features

- **Chat (landing page)** — log interactions by typing or speaking; search your network; get recommendations
- **Dashboard** — top interacted people, reconnect suggestions, daily AI nudges
- **Person profiles** — closeness, tags, likes/dislikes, highlights, relationship summary, timeline
- **Invite-only Google accounts** — each user has a private network
- **Ops admin** — separate id/password login for metrics + invite codes only

## Accounts

| Who | How they sign in | What they get |
|---|---|---|
| You / invitees | Google (`OWNER_EMAIL` needs no invite) | Full app (chat, dashboard, people) |
| Ops admin | `ADMIN_ID` + `ADMIN_PASSWORD` at `/admin/login` | Metrics + invites only |

Existing Neon data is attached to `OWNER_EMAIL` as a normal user — not the ops admin.

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL / [Neon](https://neon.tech)
- Google Cloud OAuth **Web** client (free standard OAuth)

### Setup

```bash
npm install
cp .env.example .env
# Fill OWNER_EMAIL, ADMIN_ID, ADMIN_PASSWORD, Google + Neon URLs

npm run db:migrate
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000) — Google sign-in  
- Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth consent screen (External)
2. Credentials → OAuth client ID → **Web application**
3. Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR_DOMAIN/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

While consent is in **Testing**, add each invitee as a test user, or publish the app.

### Inviting others

1. Open `/admin/login` with `ADMIN_ID` / `ADMIN_PASSWORD`
2. **Invites** tab → **New invite** → **Copy link**
3. Invitee opens the link and continues with Google

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres / Neon connection string |
| `AUTH_SECRET` | Auth.js + admin cookie signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret |
| `OWNER_EMAIL` | Google email that owns bootstrapped network data |
| `ADMIN_ID` | Ops admin username |
| `ADMIN_PASSWORD` | Ops admin password |
| `ANTHROPIC_API_KEY` | Claude API key |

Optional: `CHAT_MODEL`, `LIGHT_MODEL`.

Admin **est. cost** = logged tokens × Anthropic list prices (not an invoice).

## Deploy (Vercel + Neon)

1. Push to GitHub
2. Set the same env vars on Vercel (including `OWNER_EMAIL`, `ADMIN_ID`, `ADMIN_PASSWORD`)
3. Remove old `APP_PIN` / `ADMIN_EMAIL` if present
4. Deploy — build runs `prisma migrate deploy` + owner bootstrap
5. Add production Google redirect URI
6. Sign in at the app with Google (`OWNER_EMAIL`); open `/admin/login` for ops

## Project structure

```
src/
  app/
    page.tsx           # Chat
    dashboard/         # User dashboard
    admin/             # Ops metrics + invites
    admin/login/       # Admin id/password login
    people/[id]/       # Person profile
    api/
  lib/
    auth.ts            # Google Auth.js + invite gate
    adminAuth.ts       # Env-password admin session
    ai.ts / llm.ts     # Claude + usage logging
prisma/schema.prisma
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (migrate + owner bootstrap) |
| `npm run db:migrate` | Apply migrations + set owner email |
| `npm run db:bootstrap-admin` | Re-run owner email attachment |
| `npm run db:studio` | Prisma Studio |
| `npm run icons` | Regenerate PWA icons |
