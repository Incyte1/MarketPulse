# MarketPulse Backend

## Setup
1. Create and activate a virtual environment
2. Install requirements:
   `pip install -r requirements.txt`
3. Add keys to `.env`
4. Run:
   `uvicorn app.main:app --reload`
5. Optional compile sanity check:
   `python -m compileall app/services/news_service.py`

## Endpoints
- GET /api/health
- GET /api/ticker/{symbol}/summary?interval=1day
- GET /api/ticker/{symbol}/news?interval=1day
- POST /api/ticker/{symbol}/refresh?interval=1day&range=1M
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

## Cloudflare live wiring
- `scripts/start_unveni_backend.ps1` runs the FastAPI app on `127.0.0.1:8000` without reload mode.
- `scripts/start_unveni_tunnel.ps1` fetches a fresh Cloudflare tunnel token and starts the `unveni-api` tunnel.
- User-level startup launchers are installed at:
  - `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\UnveniBackendApi.cmd`
  - `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\UnveniBackendTunnel.cmd`

The public site at `https://unveni.com` reaches the backend through a Workers VPC binding backed by that tunnel.

## Hosted backend on Render
This repo now includes a root-level `render.yaml` blueprint that deploys the FastAPI backend as a Render web service with a persistent disk for the SQLite files.

### What the blueprint does
- Deploys `marketpulse-backend` as `unveni-api`
- Runs `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Attaches a persistent disk at `/opt/render/project/src/.render-data`
- Stores `marketpulse_auth.db`, `marketpulse_cache.db`, and `news_cache.db` on that disk through `APP_DATA_DIR`

### Deploy steps
1. Push this repo to GitHub.
2. In Render, create a new Blueprint and point it at the repo.
3. Fill in the prompted secret env vars:
   - `NEWS_API_KEY`
   - `FINNHUB_API_KEY`
   - `TWELVE_DATA_API_KEY`
   - `OPENAI_API_KEY`
4. Deploy the service and wait for `/api/health` to return OK on the Render URL.
5. In Cloudflare Workers, set `API_ORIGIN` on the frontend Worker to that Render URL.
6. Redeploy the frontend Worker from `marketpulse-frontend` with `npm run deploy`.

After that, `https://unveni.com` no longer depends on your PC or the local tunnel staying online.
