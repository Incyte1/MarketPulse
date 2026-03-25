# MarketPulse Backend

## Setup
1. Create and activate a virtual environment
2. Install requirements:
   `pip install -r requirements.txt`
3. Add keys to `.env`
4. Run:
   `uvicorn app.main:app --reload`

## Endpoints
- GET /api/health
- GET /api/ticker/{symbol}/analysis
- GET /api/ticker/{symbol}/chart?interval=1day&range=1Y
- GET /api/ticker/{symbol}/news
