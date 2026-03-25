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
   - This only checks syntax/bytecode compilation; it does not run the API server.

## Endpoints
- GET /api/health
- GET /api/ticker/{symbol}/summary?interval=15min
- GET /api/ticker/{symbol}/news
- POST /api/ticker/{symbol}/refresh?interval=15min&range=5D
