# MarketPulse Frontend

## Setup
1. Copy `.env.local.example` to `.env.local`
2. Make sure your FastAPI backend is running on `http://127.0.0.1:8000`
3. Install dependencies (required before any `npm run build`):
   ```bash
   npm ci
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

Open `http://localhost:3000`

## Build troubleshooting (Windows PowerShell)
If you see:

`'next' is not recognized as an internal or external command`

it means dependencies were not installed in `node_modules`.

Run:
```powershell
npm ci
npm run build
```

The project now includes a `check:next` pre-check in the build script to print a direct dependency error message when Next.js is missing.

## Auth pages included
- `/login`
- `/register`

Current social login buttons are local demo flows (Google/Facebook UI only, no backend OAuth exchange yet).

Seeded local admin account:
- Email: `admin@marketpulse.dev`
- Password: `Admin@12345`

## What this includes
- Premium dark dashboard shell
- Search + quick picks
- TradingView advanced chart widget with watchlist
- Backend wiring for summary/news/refresh APIs
- Login/register pages and local demo auth
