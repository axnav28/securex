# SecureX

SecureX is a cyber-risk quantification dashboard for turning attack-path evidence into financial decisions. The repository contains a Next.js frontend and a FastAPI backend backed by Postgres and Redis for local development.

## What is included

- Next.js dashboard with organization switching, risk summaries, simulator, attack graph, optimizer, compliance, reports, trends, audit log, methodology, and settings.
- FastAPI endpoints for authentication, organization-scoped risk data, simulations, scenarios, audit history, integrations, and copilot responses.
- A deterministic 10,000-iteration Monte Carlo calculation with overlap-safe loss aggregation.
- Postgres persistence for organizations, scenarios, snapshots, integrations, and hash-chained audit entries.
- Redis caching for risk-summary responses.

## Requirements

- Node.js 18+
- Python 3.11+ if running the API outside Docker
- Docker Desktop with Docker Compose

## Run the full stack

```bash
cp .env.example .env.local
npm install
docker compose up --build -d
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000](http://localhost:8000), with a health check at `/health`.

To stop the services:

```bash
docker compose down
```

The Postgres volume is retained by default, so saved scenarios and audit entries survive a normal Compose restart.

## Run the API without Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Postgres and Redis should still be available if persistence and caching are required. When they are unavailable, the API keeps the seeded in-memory fallback used by the demo.

## Demo authentication

The login flow issues and validates JWTs for the demo. Credential verification against persisted user passwords is intentionally stubbed: any email and password can obtain a demo token. Organization-scoped API routes still require a valid bearer token.

## Useful checks

```bash
npm run build
python3 -m py_compile backend/main.py backend/db.py backend/cache.py backend/quantification.py
docker compose ps
curl http://localhost:8000/health
```

See [API_CONTRACT.md](./API_CONTRACT.md) for the frontend/backend response contract.

## Deploy to Render and Vercel

The repository includes [render.yaml](./render.yaml), which defines the Dockerized FastAPI service plus managed Postgres and Redis. In Render, create a new Blueprint from this repository and enter the Vercel production URL when prompted for `CORS_ORIGINS`. Render's Blueprint provisions the API and datastores together.

For the frontend, import this GitHub repository into Vercel as a Next.js project. Leave the project root at the repository root and add this production environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
```

Redeploy Vercel after setting the variable. Then confirm the same Vercel URL is present in the Render API service's `CORS_ORIGINS` value. Vercel documents that environment-variable changes apply to new deployments, and Render Blueprints are synced from the repository's `render.yaml` configuration.
