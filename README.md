# SecureX

### Cyber risk, priced in rupees.

SecureX is an evidence-aware cyber-risk quantification platform for security, risk, and finance teams. It connects attack-path evidence, probabilistic risk modeling, and investment optimization so organizations can defend where the next security rupee should go.

## Project information

| Field | Details |
| --- | --- |
| Team | A2Z · Netaji Subhas University of Technology (NSUT) |
| Idea | SecureX |
| Problem Statement ID (PS ID) | SIH26105 |
| Problem Statement Title | AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform |
| Theme | Blockchain & Cybersecurity |
| Category | Software |
| Repository | [github.com/axnav28/securex](https://github.com/axnav28/securex) |

## Live deployment

- Frontend: [securex-a2z.vercel.app](https://securex-a2z.vercel.app)
- API: [securex-api-yvi2.onrender.com](https://securex-api-yvi2.onrender.com)
- Health: [securex-api-yvi2.onrender.com/health](https://securex-api-yvi2.onrender.com/health)

## Problem

Security teams have alerts, controls, vulnerability findings, and attack paths. Boards still need a defensible answer to two questions: **what is the exposure worth, and which control should we fund next?**

## Proposed solution

SecureX converts technical exposure into an evidence-aware financial decision. It models connected vulnerability–asset–control paths, quantifies expected annual loss, tests controls through scenarios, and recommends investments within a rational spend ceiling.

## Key capabilities

- Executive dashboard with expected annual loss, posture, confidence mix, and risk contributors
- What-if simulator with live control and budget sensitivity
- Interactive attack graph with root-cause and downstream exposure tracing
- Investment optimizer with reduction, cost, ROI, and Gordon–Loeb bounded recommendations
- Compliance intelligence across ISO 27001, NIST CSF, CIS, RBI, and SEBI mappings
- Trends, board reports, methodology, integrations, and hash-chained audit history
- SecureX Copilot for natural-language risk questions
- Organization switching for multiple seeded demonstration organizations

## Architecture

```text
Security signals + CVE intelligence
              │
              ▼
     Vulnerability–Asset–Control graph
              │
              ▼
   FAIR risk model + Monte Carlo engine
              │
              ▼
 Gordon–Loeb bounded investment optimizer
              │
              ▼
 Dashboard · scenarios · reports · audit trail
```

See the full architecture in [docs/architecture.md](docs/architecture.md) and the presentation diagrams in [assets/diagrams](assets/diagrams).

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Recharts, Lucide |
| API | FastAPI, Pydantic, Uvicorn |
| Persistence | PostgreSQL, SQLAlchemy async, asyncpg |
| Cache | Redis-compatible Render Key Value |
| Local infrastructure | Docker Compose |
| Deployment | Vercel + Render |

## Repository structure

```text
securex/
├── README.md
├── LICENSE
├── package.json
├── requirements.txt
├── docker-compose.yml
├── render.yaml
├── src/
│   ├── app/                  # Next.js routes, layouts, and global styles
│   ├── components/           # Shared UI, shell, charts, and providers
│   ├── lib/                  # API client, organization helpers, mock fallback
│   └── backend/              # FastAPI service, database, cache, quantification
├── docs/
│   ├── architecture.md
│   └── api-contract.md
├── assets/
│   └── diagrams/
├── submission/
│   └── a2z_SIH2026_Presentation.pdf
└── .github/workflows/ci.yml
```

## Local development

### Requirements

- Node.js 18+
- Python 3.11+
- Docker Desktop with Docker Compose

### Start the full stack

```bash
git clone https://github.com/axnav28/securex.git
cd securex
cp .env.example .env.local
npm install
docker compose up --build -d
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local API runs at [http://localhost:8000](http://localhost:8000).

### Run the API without Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --app-dir src/backend --host 127.0.0.1 --port 8000
```

### Validate

```bash
npm run build
python3 -m py_compile src/backend/main.py src/backend/db.py src/backend/cache.py src/backend/quantification.py
docker compose config
curl http://localhost:8000/health
```

## Data and demo scope

The computation, JWT session, persistence, caching, scenario, and audit mechanisms are implemented in the backend. The organization, asset, vulnerability, and control records are seeded demonstration data rather than live feeds from external security products. The frontend retains a graceful mock-data fallback when the API is unavailable.

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Presentation](submission/a2z_SIH2026_Presentation.pdf)

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
