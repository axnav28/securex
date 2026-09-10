from __future__ import annotations

import os
from secrets import token_urlsafe
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from db import AuditRow, ScenarioRow, db_audit_entries, db_append_audit, db_integrations, db_save_scenario, db_save_snapshot, db_scenarios, db_set_integration, init_db
from cache import cached, put, invalidate
from quantification import deduplicate_reductions, monte_carlo_eal

Confidence = Literal['Verified', 'Configured', 'Estimated']
IntegrationStatus = Literal['connected', 'not_connected']

SECRET = os.getenv('SECUREX_JWT_SECRET') or token_urlsafe(32)
ALGORITHM = 'HS256'


class Node(BaseModel):
    id: str
    name: str
    type: str
    confidence: Confidence
    risk: float
    x: float
    y: float
    cves: list[str]


class Edge(BaseModel):
    source: str
    target: str
    weight: float


class Control(BaseModel):
    id: str
    name: str
    category: str
    impact: float
    cost: float
    on: bool


class Organization(BaseModel):
    id: str
    name: str
    tier: Literal['Enterprise', 'MSME-Lite']


class LoginRequest(BaseModel):
    email: str
    password: str = ''


class SimulateRequest(BaseModel):
    toggled_control_ids: list[str] = Field(default_factory=list)


class ScenarioRequest(BaseModel):
    name: str
    toggled_control_ids: list[str] = Field(default_factory=list)


class IntegrationPatch(BaseModel):
    status: IntegrationStatus


class CopilotRequest(BaseModel):
    message: str


class OrgAccess:
    def __init__(self, org_id: str):
        if org_id not in ORGS:
            raise HTTPException(status_code=404, detail='Organization not found')
        self.org_id = org_id
        self.org = ORGS[org_id]


bearer = HTTPBearer(auto_error=False)


def scoped_org(org_id: str, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> OrgAccess:
    if credentials is None:
        raise HTTPException(status_code=401, detail='Bearer token required')
    try:
        jwt.decode(credentials.credentials, SECRET, algorithms=[ALGORITHM])
    except JWTError as error:
        raise HTTPException(status_code=401, detail='Invalid or expired token') from error
    return OrgAccess(org_id)


ORGS: dict[str, Organization] = {
    'asteria-finance': Organization(id='asteria-finance', name='Asteria Finance', tier='Enterprise'),
    'northstar-microcredit': Organization(id='northstar-microcredit', name='Northstar Microcredit', tier='MSME-Lite'),
    'pragati-bank': Organization(id='pragati-bank', name='Pragati Bank', tier='Enterprise'),
}
PROFILE: dict[str, dict[str, float]] = {
    'asteria-finance': {'factor': 1.0, 'verified': 62, 'configured': 25, 'estimated': 13, 'critical': 7, 'refresh': 3},
    'northstar-microcredit': {'factor': .58, 'verified': 34, 'configured': 28, 'estimated': 38, 'critical': 11, 'refresh': 9},
    'pragati-bank': {'factor': 1.18, 'verified': 76, 'configured': 17, 'estimated': 7, 'critical': 4, 'refresh': 2},
}
BASE_EAL = 42_800_000.0

BASE_NODES = [
    ('pay', 'Payment Gateway Server', 'Critical asset', 'Verified', 8_200_000, 49, 39, ['CVE-2024-21410']),
    ('core', 'Core Banking DB', 'Data store', 'Verified', 7_600_000, 70, 53, ['CVE-2023-34362']),
    ('sso', 'Employee SSO Provider', 'Identity', 'Configured', 6_500_000, 25, 35, ['CVE-2024-49112']),
    ('api', 'Customer API Gateway', 'Internet-facing', 'Configured', 5_400_000, 35, 62, ['CVE-2024-6387']),
    ('vendor', 'Collections Vendor VPN', 'Third party', 'Estimated', 4_100_000, 76, 25, ['CVE-2023-4966']),
    ('backup', 'Immutable Backup Vault', 'Resilience', 'Verified', 1_900_000, 84, 72, []),
    ('staff', 'Branch Workforce', 'User group', 'Estimated', 3_200_000, 15, 68, []),
    ('siem', 'SOC / SIEM Cluster', 'Detection', 'Configured', 1_200_000, 57, 76, []),
    ('mobile', 'Mobile Banking App', 'Application', 'Estimated', 2_800_000, 20, 18, ['CVE-2024-3094']),
    ('admin', 'Privileged Admin Console', 'Identity', 'Verified', 3_700_000, 47, 18, []),
]
EDGES = [('pay', 'core', .82), ('pay', 'sso', .7), ('pay', 'api', .64), ('core', 'vendor', .55), ('core', 'backup', .32), ('sso', 'api', .48), ('sso', 'staff', .46), ('api', 'siem', .22), ('vendor', 'backup', .19), ('staff', 'mobile', .31), ('mobile', 'admin', .38)]
BASE_CONTROLS = [
    ('mfa-privileged', 'Enforce MFA on privileged accounts', 'Identity', 6_200_000, 1_800_000, True),
    ('segment-payment', 'Segment payment processing network', 'Network', 5_400_000, 2_600_000, False),
    ('edr-branches', 'EDR on branch endpoints', 'Endpoint', 3_100_000, 1_200_000, False),
    ('encrypt-data', 'Encrypt customer data at rest', 'Data', 2_700_000, 900_000, True),
    ('jit-admin', 'Privileged access just-in-time', 'Identity', 4_200_000, 1_500_000, False),
    ('managed-detection', '24×7 managed detection response', 'Endpoint', 3_600_000, 2_200_000, False),
]
FRAMEWORKS = ['ISO 27001', 'NIST CSF', 'CIS Controls', 'RBI 2026 Directions', 'SEBI CSCRF']


def factor(org_id: str) -> float:
    return PROFILE[org_id]['factor']


def get_nodes(org_id: str) -> list[Node]:
    selected = PROFILE[org_id]
    nodes: list[Node] = []
    for node in BASE_NODES:
        confidence: Confidence = node[3]  # type: ignore[assignment]
        if org_id == 'northstar-microcredit' and confidence == 'Verified':
            confidence = 'Configured'
        nodes.append(Node(id=node[0], name=node[1], type=node[2], confidence=confidence, risk=node[4] * selected['factor'], x=node[5], y=node[6], cves=node[7]))
    return nodes


def get_controls(org_id: str) -> list[Control]:
    return [Control(id=c[0], name=c[1], category=c[2], impact=c[3] * factor(org_id), cost=c[4], on=c[5]) for c in BASE_CONTROLS]


def eal_for(org_id: str, toggled: list[str] | None = None) -> float:
    return quantified(org_id, toggled)['eal']


def quantified(org_id: str, toggled: list[str] | None = None) -> dict[str, float | int | bool]:
    """Run the overlap-safe simulation and calibrate it to the demo baseline."""
    active = set(toggled or [])
    shared_groups = {
        'mfa-privileged': 'identity-api',
        'jit-admin': 'identity-api',
        'segment-payment': 'payment-core',
        'encrypt-data': 'payment-core',
        'edr-branches': 'branch-mobile',
        'managed-detection': 'branch-mobile',
    }
    reduction = deduplicate_reductions([
        (shared_groups.get(c.id, c.id), c.impact)
        for c in get_controls(org_id)
        if c.id in active
    ])
    baseline_raw = monte_carlo_eal(factor=factor(org_id))
    result_raw = monte_carlo_eal(factor=factor(org_id), control_reduction=reduction)
    raw_eal = float(baseline_raw['eal'])
    calibration = BASE_EAL * factor(org_id) / max(raw_eal, 1.0)
    return {
        'eal': round(float(result_raw['eal']) * calibration, 2),
        'var99': round(float(result_raw['var99']) * calibration, 2),
        'iterations': int(result_raw['iterations']),
        'overlap_safe': bool(result_raw['overlap_safe']),
    }


def curve(reduction: float = 0) -> list[dict[str, float | str]]:
    base = [('₹0L', 100), ('₹25L', 67), ('₹50L', 43), ('₹1Cr', 26), ('₹2Cr', 12), ('₹5Cr', 3)]
    return [{'x': x, 'y': max(0, round(y - reduction / 100_000, 1))} for x, y in base]


def trend(org_id: str) -> list[dict[str, float | str]]:
    base = [51.2, 49.8, 48.4, 46.1, 44.8, 45.3, 42.8, 41.9]
    months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
    return [{'month': month, 'eal': round(value * factor(org_id), 1)} for month, value in zip(months, base)]


app = FastAPI(title='SecureX API', version='1.0.0')
cors_origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])


@app.on_event('startup')
async def startup() -> None:
    await init_db(ORGS, BASE_NODES, BASE_CONTROLS, EDGES)


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'securex-api'}


@app.post('/api/v1/auth/login')
async def login(payload: LoginRequest) -> dict[str, object]:
    token = jwt.encode({'sub': payload.email, 'exp': datetime.now(timezone.utc) + timedelta(hours=8)}, SECRET, algorithm=ALGORITHM)
    return {'access_token': token, 'token_type': 'bearer', 'user': {'email': payload.email, 'role': 'ciso'}}


@app.post('/api/v1/auth/logout')
async def logout() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/v1/auth/me')
async def me() -> dict[str, object]:
    return {'email': 'ciso@asteriafinance.in', 'role': 'ciso'}


@app.get('/api/v1/organizations', response_model=list[Organization])
async def organizations() -> list[Organization]:
    return list(ORGS.values())


@app.get('/api/v1/organizations/{org_id}', response_model=Organization)
async def organization(access: OrgAccess = Depends(scoped_org)) -> Organization:
    return access.org


@app.get('/api/v1/organizations/{org_id}/risk-summary')
async def risk_summary(access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    key=f'risk-summary:v2:{access.org_id}'
    hit=await cached(key)
    if hit is not None: return hit
    p = PROFILE[access.org_id]
    metrics = quantified(access.org_id)
    result={'org': access.org.name, 'eal': metrics['eal'], 'var99': metrics['var99'], 'criticalPaths': int(p['critical']), 'refreshDays': int(p['refresh']), 'trendDelta': -7.4, 'confidence': {'verified': int(p['verified']), 'configured': int(p['configured']), 'estimated': int(p['estimated'])}, 'calculation': {'engine': 'monte-carlo', 'iterations': metrics['iterations'], 'overlap_safe': metrics['overlap_safe']}}
    await put(key,result,300)
    try: await db_save_snapshot(access.org_id,result['eal'],result['var99'],result['confidence'],curve())
    except Exception: pass
    return result


@app.get('/api/v1/organizations/{org_id}/loss-exceedance-curve')
async def loss_curve(access: OrgAccess = Depends(scoped_org)) -> list[dict[str, float | str]]:
    return curve()


@app.get('/api/v1/organizations/{org_id}/top-risk-contributors', response_model=list[Node])
async def top_risk(access: OrgAccess = Depends(scoped_org)) -> list[Node]:
    return get_nodes(access.org_id)[:5]


@app.get('/api/v1/organizations/{org_id}/controls', response_model=list[Control])
async def controls(access: OrgAccess = Depends(scoped_org)) -> list[Control]:
    return get_controls(access.org_id)


@app.post('/api/v1/organizations/{org_id}/simulate')
async def simulate(payload: SimulateRequest, access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    await invalidate(f'risk-summary:v2:{access.org_id}')
    baseline = eal_for(access.org_id)
    result = eal_for(access.org_id, payload.toggled_control_ids)
    reduction = baseline - result
    return {'eal': result, 'baseline_eal': baseline, 'delta': -reduction, 'loss_curve': curve(reduction), 'controls': get_controls(access.org_id)}


@app.post('/api/v1/organizations/{org_id}/scenarios')
async def save_scenario(payload: ScenarioRequest, access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    scenario_id = sha256(f'{access.org_id}:{payload.name}:{datetime.now(timezone.utc).isoformat()}'.encode()).hexdigest()[:16]
    created = datetime.now(timezone.utc)
    try:
        await db_save_scenario(ScenarioRow(id=scenario_id, org_id=access.org_id, user_id='demo', name=payload.name, toggled_control_ids=payload.toggled_control_ids, resulting_eal=eal_for(access.org_id, payload.toggled_control_ids), created_at=created))
    except Exception:
        pass
    try: await db_append_audit(access.org_id,'demo',f'Scenario {payload.name} saved')
    except Exception: pass
    return {'id': scenario_id, 'org_id': access.org_id, 'name': payload.name, 'toggled_control_ids': payload.toggled_control_ids, 'resulting_eal': eal_for(access.org_id, payload.toggled_control_ids), 'created_at': created.isoformat()}


@app.get('/api/v1/organizations/{org_id}/scenarios')
async def scenarios(access: OrgAccess = Depends(scoped_org)) -> list[object]:
    try:
        rows = await db_scenarios(access.org_id)
        return [{'id': row.id, 'org_id': row.org_id, 'name': row.name, 'toggled_control_ids': row.toggled_control_ids, 'resulting_eal': row.resulting_eal, 'created_at': row.created_at.isoformat()} for row in rows]
    except Exception:
        return []


@app.get('/api/v1/organizations/{org_id}/graph')
async def graph(access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    key=f'graph:{access.org_id}'; hit=await cached(key)
    if hit is not None: return hit
    result={'nodes': [n.model_dump() for n in get_nodes(access.org_id)], 'edges': [Edge(source=a, target=b, weight=w).model_dump() for a, b, w in EDGES]}
    await put(key,result,300); return result


@app.get('/api/v1/organizations/{org_id}/graph/nodes/{node_id}')
async def graph_node(node_id: str, access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    node = next((item for item in get_nodes(access.org_id) if item.id == node_id), None)
    if node is None:
        raise HTTPException(status_code=404, detail='Node not found')
    return {**node.model_dump(), 'cve_details': [{'cve_id': cve, 'cvss_score': 8.1, 'epss_score': .42, 'is_kev': True} for cve in node.cves], 'controls': [{'name': 'MFA on privileged access', 'status': 'Verified'}, {'name': 'Network segmentation', 'status': 'Configured'}], 'paths': ['Payment → Core DB', 'Vendor → Backup Vault']}


@app.get('/api/v1/organizations/{org_id}/graph/choke-points')
async def choke_points(access: OrgAccess = Depends(scoped_org)) -> dict[str, list[str]]:
    return {'node_ids': ['pay', 'core', 'sso']}


@app.get('/api/v1/organizations/{org_id}/optimizer/frontier')
async def frontier(access: OrgAccess = Depends(scoped_org)) -> list[dict[str, float]]:
    return [{'x': x, 'reduction': y * factor(access.org_id)} for x, y in [(0, 0), (200, 18), (400, 32), (600, 43), (800, 51), (1000, 57), (1200, 60), (1400, 62), (1580, 63)]]


@app.get('/api/v1/organizations/{org_id}/optimizer/recommendations')
async def recommendations(budget: float = Query(100, ge=0), access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    available = sorted(get_controls(access.org_id), key=lambda item: item.impact / item.cost, reverse=True)
    chosen: list[dict[str, object]] = []
    spent = 0.0
    for item in available:
        if spent + item.cost <= budget * 100_000:
            chosen.append({'name': item.name, 'category': item.category, 'cost': item.cost, 'impact': item.impact, 'paths': ['Payment → Core DB'], 'deduplicated': True})
            spent += item.cost
    return {'budget': budget, 'ceiling': BASE_EAL * factor(access.org_id) * .37, 'recommendations': chosen}


@app.get('/api/v1/organizations/{org_id}/compliance/matrix')
async def compliance(framework: str | None = None, access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    selected = [framework] if framework in FRAMEWORKS else FRAMEWORKS
    rows = [{'control': item.name, 'values': [((i + j) % 3 != 1) for j, _ in enumerate(selected)], 'equivalence_group': f'eq-{i // 2}' if i < 4 else None} for i, item in enumerate(get_controls(access.org_id))]
    return {'frameworks': selected, 'rows': rows}


@app.post('/api/v1/organizations/{org_id}/compliance/evidence-pack')
async def evidence_pack(access: OrgAccess = Depends(scoped_org)) -> dict[str, str]:
    return {'status': 'ready', 'message': f'Evidence pack prepared for {access.org.name}'}


@app.get('/api/v1/organizations/{org_id}/trends/eal-history')
async def eal_history(access: OrgAccess = Depends(scoped_org)) -> list[dict[str, float | str]]:
    return trend(access.org_id)


@app.get('/api/v1/organizations/{org_id}/trends/confidence-mix-history')
async def confidence_history(access: OrgAccess = Depends(scoped_org)) -> list[dict[str, float | str]]:
    p = PROFILE[access.org_id]
    return [{'month': month, 'verified': p['verified'] - i, 'configured': p['configured'] + i / 2, 'estimated': p['estimated'] + i / 2} for i, month in enumerate(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'])]


@app.get('/api/v1/organizations/{org_id}/reports/board-preview')
async def board_preview(access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    p = PROFILE[access.org_id]
    return {'org': access.org.name, 'eal': eal_for(access.org_id), 'trend': trend(access.org_id), 'confidence': {'verified': p['verified'], 'configured': p['configured'], 'estimated': p['estimated']}, 'bullets': ['Privileged access moved to verified MFA enforcement', 'Payment gateway paths re-tested after segmentation', 'Evidence mapped to RBI and SEBI control families']}


@app.get('/api/v1/organizations/{org_id}/reports/download', response_class=PlainTextResponse)
async def report_download(access: OrgAccess = Depends(scoped_org)) -> str:
    return f'{access.org.name} SecureX board report\nEstimated annual loss: ₹{eal_for(access.org_id) / 10_000_000:.2f} Cr\n'


@app.get('/api/v1/organizations/{org_id}/audit-log')
async def audit_log(access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    try:
        stored=await db_audit_entries(access.org_id)
        if stored:
            return {'chain_intact': all(row.prev_hash == ('0'*64 if i == 0 else stored[i-1].hash) for i,row in enumerate(stored)), 'entries':[{'timestamp':row.timestamp.isoformat(),'actor':row.actor,'change_description':row.change_description,'hash':row.hash,'prev_hash':row.prev_hash} for row in stored]}
    except Exception: pass
    entries: list[dict[str, str]] = []
    previous = '0' * 64
    for i in range(8):
        change = ['Control MFA status: Configured → Verified', 'Graph refresh completed', 'Scenario Board baseline saved', 'EPSS score recalculated'][i % 4]
        digest = sha256(f'{previous}{change}'.encode()).hexdigest()
        entries.append({'timestamp': f'2026-09-05T0{i}:15:00Z', 'actor': 'system' if i % 3 else 'ciso@asteria', 'change_description': change, 'hash': digest, 'prev_hash': previous})
        previous = digest
    return {'chain_intact': True, 'entries': entries}


@app.get('/api/v1/organizations/{org_id}/methodology')
async def methodology(access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    return {'intended_use': 'Decision support for security investment prioritization and board communication.', 'limitations': ['Small Indian enterprise calibration dataset', 'EPSS is a probability signal, not an incident forecast'], 'brier_score': .14, 'next_review_date': '2026-12-15'}


INTEGRATIONS: dict[str, dict[str, IntegrationStatus]] = {org_id: {'qualys': 'connected', 'tenable': 'connected', 'splunk': 'not_connected', 'crowdstrike': 'not_connected'} for org_id in ORGS}


@app.get('/api/v1/organizations/{org_id}/integrations')
async def integrations(access: OrgAccess = Depends(scoped_org)) -> list[dict[str, str]]:
    rows = await db_integrations(access.org_id)
    if rows is not None:
        return rows
    return [{'id': key, 'provider_name': key.title(), 'status': value} for key, value in INTEGRATIONS[access.org_id].items()]


@app.patch('/api/v1/organizations/{org_id}/integrations/{integration_id}')
async def update_integration(integration_id: str, payload: IntegrationPatch, access: OrgAccess = Depends(scoped_org)) -> dict[str, str]:
    db_id = integration_id if integration_id.startswith(access.org_id + '-') else f'{access.org_id}-{integration_id}'
    if await db_set_integration(access.org_id, db_id, payload.status):
        await invalidate(f'risk-summary:{access.org_id}')
        return {'id': integration_id, 'status': payload.status}
    if integration_id not in INTEGRATIONS[access.org_id]:
        raise HTTPException(status_code=404, detail='Integration not found')
    INTEGRATIONS[access.org_id][integration_id] = payload.status
    return {'id': integration_id, 'status': payload.status}


@app.post('/api/v1/organizations/{org_id}/copilot/query')
async def copilot(payload: CopilotRequest, access: OrgAccess = Depends(scoped_org)) -> dict[str, object]:
    is_fix = any(word in payload.message.lower() for word in ['fix', 'fund', 'invest', 'control', 'spend'])
    node = 'pay' if not is_fix else 'admin'
    selected = next(item for item in get_nodes(access.org_id) if item.id == node)
    if is_fix:
        text = f'For {access.org.name}, fund Enforce MFA on privileged accounts first. It is the highest-leverage control for the current exposure.'
    else:
        text = f'{access.org.name} is carrying its largest exposure through the Payment Gateway Server and Core Banking DB.'
    return {'text': text, 'citations': [{'node_id': selected.id, 'node_name': selected.name, 'confidence_tag': selected.confidence}]}
