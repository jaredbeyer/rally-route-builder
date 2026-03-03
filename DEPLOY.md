# Rally Route Builder — Deployment Guide

## Prerequisites
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) account (free tier works)
- Node.js 18+

## Step 1: Set Up Supabase

1. Create a new Supabase project at https://app.supabase.com
2. Go to **SQL Editor** → **New Query** and paste the contents of `supabase/migrations/001_create_projects.sql`, then run it
3. Go to **Authentication** → **Providers**:
   - Enable **Google**: add your Google OAuth Client ID and Secret ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - Enable **Apple**: add your Apple Services ID and Secret ([Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId))
4. Go to **Authentication** → **URL Configuration**:
   - Set **Site URL** to your production domain (e.g. `https://rally.yourdomain.com`)
   - Add `http://localhost:3000/auth/callback` and `https://rally.yourdomain.com/auth/callback` to **Redirect URLs**
5. Copy your **Project URL** and **anon key** from **Settings** → **API**

## Step 2: Local Development

```bash
cd rally-route-builder
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Step 3: Deploy to Vercel

1. Push the `rally-route-builder` folder to a GitHub repo
2. Go to [Vercel](https://vercel.com/new) → Import your repo
3. Add these environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your production URL)
4. Deploy

## Step 4: Update OAuth Redirect URLs

After deploying, add your Vercel domain to:
- **Supabase** → Authentication → URL Configuration → Redirect URLs: `https://your-app.vercel.app/auth/callback`
- **Google Cloud Console** → Authorized redirect URIs
- **Apple Developer** → Return URLs

## Architecture Overview

- **Next.js 14 App Router** — Server components for data fetching, client components for interactivity
- **Supabase Auth** — OAuth with Google + Apple, session management via cookies
- **Supabase PostgreSQL** — Single `projects` table with JSONB columns for route data
- **Supabase Storage** — Private `route-files` bucket for uploaded GPX/KML files
- **Leaflet** — Interactive map rendering (client-side only via `next/dynamic`)
- **Row Level Security** — Each user can only access their own projects
