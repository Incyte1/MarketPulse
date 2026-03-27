# Unveni Frontend

## Setup
1. Copy `.env.local.example` to `.env.local`
2. Make sure your FastAPI backend is running on `http://127.0.0.1:8000`
3. Install dependencies:
   ```bash
   npm ci
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

Open `http://localhost:3000`

## Environment variables
```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=https://unveni.com
```

`NEXT_PUBLIC_SITE_URL` is used for metadata, canonical URLs, and the domain-facing brand configuration.

## Build troubleshooting (Windows PowerShell)
If you see:

`'next' is not recognized as an internal or external command`

it means dependencies were not installed in `node_modules`.

`npm run build` now installs dependencies automatically only when `node_modules` is missing, then runs `next build`, so on a fresh clone you can usually just run:
```powershell
npm run build
```

If you want to install dependencies separately first, run:
```powershell
npm ci
```

## Auth pages included
- `/login`
- `/register`

Authentication now uses backend-backed email/password accounts with persistent sessions.

## What this includes
- Reworked Unveni workstation shell
- Search + quick-open coverage rail
- TradingView advanced chart widget with drawing tools
- Backend wiring for summary/news/refresh APIs
- Login/register pages with real backend auth

## Cloudflare deploy
The production frontend is configured as a static-assets Worker for `https://unveni.com`.

From `marketpulse-frontend`:

```powershell
npm run deploy
```

Production builds use `.env.production`, which keeps frontend API calls same-origin so the Worker can proxy `/api/*` into the backend tunnel.

The live Worker now proxies `/api/*` to the hosted Render backend at `https://unveni-api.onrender.com` through the `API_ORIGIN` Worker variable defined in `wrangler.jsonc`.

## Hosted backend option
If you move the FastAPI backend to a different host later, update the Worker environment variable named `API_ORIGIN` to that public backend origin, for example:

```text
API_ORIGIN=https://unveni-api.onrender.com
```

When `API_ORIGIN` is set, the Worker proxies `/api/*` to that origin and no longer depends on a local Cloudflare tunnel.

Then redeploy the Worker:

```powershell
npm run deploy
```
