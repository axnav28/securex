# SecureX architecture

## Runtime flow

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

## System boundaries

- **Frontend:** Next.js application in `src/app`, shared UI in `src/components`, and browser data access in `src/lib`.
- **Backend:** FastAPI service in `src/backend` with JWT sessions, organization-scoped routes, quantification, persistence, caching, and audit events.
- **Persistence:** PostgreSQL stores organizations, scenarios, snapshots, integrations, and audit records.
- **Cache:** Redis-compatible storage accelerates risk summaries and graph responses.
- **Deployment:** Vercel hosts the frontend; Render hosts the API and managed data services.

## Quantification principles

1. Attack paths are modeled through shared vulnerability, asset, and control relationships.
2. Confidence is explicit: Verified, Configured, or Estimated.
3. Monte Carlo simulation represents uncertainty across possible loss outcomes.
4. Shared path reductions are deduplicated so one choke point is not credited twice.
5. Investment recommendations are bounded by the Gordon–Loeb rational-spend ceiling.

The compact diagrams used in the presentation are stored in [`assets/diagrams`](../assets/diagrams).
