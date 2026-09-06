# SecureX API Contract

This contract documents the response shapes used by the connected frontend. The seeded mock layer remains as a graceful fallback when the API is unavailable.

## Shared enums and primitives

```ts
type Confidence = 'Verified' | 'Configured' | 'Estimated';
type Node = {
  id: string; name: string; type: string; confidence: Confidence;
  risk: number; x: number; y: number; cves: string[];
};
type Control = {
  name: string; category: string; impact: number; cost: number; on: boolean;
};
```

## Organizations

`GET /api/v1/organizations`

```json
[{"id":"asteria-finance","name":"Asteria Finance","tier":"Enterprise"}]
```

Organizations: `Asteria Finance`, `Northstar Microcredit`, and `Pragati Bank`.

## Dashboard

`GET /api/v1/organizations/{org_id}/risk-summary`

```json
{"org":"Asteria Finance","eal":42800000,"var99":113673443.06,"criticalPaths":7,"refreshDays":3,"trendDelta":-7.4,"confidence":{"verified":62,"configured":25,"estimated":13},"calculation":{"engine":"monte-carlo","iterations":10000,"overlap_safe":true}}
```

`GET /api/v1/organizations/{org_id}/loss-exceedance-curve`

```json
[{"x":"₹0L","y":100},{"x":"₹25L","y":67},{"x":"₹50L","y":43},{"x":"₹1Cr","y":26},{"x":"₹2Cr","y":12},{"x":"₹5Cr","y":3}]
```

`GET /api/v1/organizations/{org_id}/top-risk-contributors` returns `Node[]` with the same fields as the mock `nodes` entries.

## Simulator

`GET /api/v1/organizations/{org_id}/controls` returns `Control[]`.

`POST /api/v1/organizations/{org_id}/simulate`

Request: `{"toggled_control_ids":["mfa-privileged"]}`

Response: `{"eal":36600000,"baseline_eal":42800000,"delta":-6200000,"loss_curve":[{"x":"₹0L","y":...}],"controls":[Control]}`

## Graph

`GET /api/v1/organizations/{org_id}/graph`

```json
{"nodes":[Node],"edges":[{"source":"pay","target":"core","weight":0.82}]}
```

`GET /api/v1/organizations/{org_id}/graph/nodes/{node_id}` returns `Node` plus `cve_details`, `controls`, and `paths` additive fields.

`GET /api/v1/organizations/{org_id}/graph/choke-points` returns `{"node_ids":["pay","core","sso"]}`.

## Optimizer

`GET /api/v1/organizations/{org_id}/optimizer/frontier` returns `[{"x":number,"reduction":number}]` where `x` is spend in lakh rupees and `reduction` is percent.

`GET /api/v1/organizations/{org_id}/optimizer/recommendations?budget=100`

Returns `{"budget":100,"ceiling":1580,"recommendations":[{"name":string,"category":string,"cost":number,"impact":number,"paths":string[],"deduplicated":true}]}`.

## Compliance, trends, reports, audit, methodology, settings, copilot

These endpoints preserve the frontend's current values and add API-friendly metadata:

- `GET /api/v1/organizations/{org_id}/compliance/matrix?framework=...` → `{"frameworks":string[],"rows":[{"control":string,"values":boolean[],"equivalence_group":string|null}]}`
- `POST /api/v1/organizations/{org_id}/compliance/evidence-pack` → `{"status":"ready","message":string}`
- `GET /api/v1/organizations/{org_id}/trends/eal-history` → `[{"month":string,"eal":number}]`
- `GET /api/v1/organizations/{org_id}/trends/confidence-mix-history` → `[{"month":string,"verified":number,"configured":number,"estimated":number}]`
- `GET /api/v1/organizations/{org_id}/reports/board-preview` → `{"org":string,"eal":number,"trend":[{"month":string,"eal":number}],"confidence":object,"bullets":string[]}`
- `GET /api/v1/organizations/{org_id}/audit-log` → `{"chain_intact":true,"entries":[{"timestamp":string,"actor":string,"change_description":string,"hash":string,"prev_hash":string}]}`
- `GET /api/v1/organizations/{org_id}/methodology` → `{"intended_use":string,"limitations":string[],"brier_score":number,"next_review_date":string}`
- `GET /api/v1/organizations/{org_id}/integrations` → `[{"id":string,"provider_name":string,"status":"connected"|"not_connected"}]`
- `PATCH /api/v1/organizations/{org_id}/integrations/{integration_id}` accepts `{"status":"connected"|"not_connected"}`.
- `POST /api/v1/organizations/{org_id}/copilot/query` accepts `{"message":string}` and returns `{"text":string,"citations":[{"node_id":string,"node_name":string,"confidence_tag":Confidence}]}`.

## Auth

- `POST /api/v1/auth/login` accepts `{"email":string,"password":string}` and returns `{"access_token":string,"token_type":"bearer","user":object}`.
- `GET /api/v1/auth/me` returns the authenticated demo user.
- `POST /api/v1/auth/logout` returns `{"status":"ok"}`.

All organization endpoints accept the seeded slug IDs and enforce organization access through the shared `OrgAccess` dependency.
