# MarketPulse Frontend

## Setup
1. Copy `.env.local.example` to `.env.local`
2. Make sure your FastAPI backend is running on `http://127.0.0.1:8000`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

Open `http://localhost:3000`

## What this includes
- Premium dark dashboard shell
- Search + quick picks
- Backend wiring for:
  - `/ticker/{symbol}/analysis`
  - `/ticker/{symbol}/chart`
  - `/ticker/{symbol}/news`
- Lightweight Charts candlestick chart
- Interval and range buttons
