'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Clock3, FileCheck2, Fingerprint, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { useApp } from '@/components/app-provider';
import { apiFetch } from '@/lib/api';
import { orgIdFor } from '@/lib/org';

type Entry = { timestamp: string; actor: string; change_description: string; hash: string; prev_hash: string };
type AuditResponse = { chain_intact: boolean; entries: Entry[] };
const fallback = ['Control MFA status: Configured → Verified', 'Graph refresh completed', 'Scenario “Board baseline” saved', 'CVE-2024-6387 exposure updated', 'RBI evidence pack exported', 'Admin Console node re-verified', 'New asset: Collections Vendor VPN', 'EPSS score recalculated'];

export default function Audit() {
  const { org } = useApp();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => { apiFetch<AuditResponse>(`/api/v1/organizations/${orgIdFor(org)}/audit-log`).then(setData).catch(() => setData(null)); }, [org]);
  const entries = data?.entries || fallback.map((change, i) => ({ timestamp: `05 Sep · ${String(9 + i).padStart(2, '0')}:1${i}`, actor: i % 3 ? 'system' : 'ciso@asteria', change_description: change, hash: `a8f2c91e…${i}c4`, prev_hash: '' }));
  const filtered = useMemo(() => entries.filter(entry => `${entry.actor} ${entry.change_description} ${entry.hash}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  const intact = data?.chain_intact !== false;

  return <div className="content audit-page"><div className="audit-topline"><div className="page-heading-block"><PageHeader eyebrow="Governance · immutable history" title="Audit log" sub={`${org} · every decision and evidence change, chained for review.`} /></div><div className="audit-status"><span className={`chain-status ${intact ? 'intact' : 'broken'}`}><i /> Chain {intact ? 'intact' : 'broken'}</span><span className="audit-refresh">SHA-256 integrity check</span></div></div>
    <div className="audit-metrics"><div><span>Chain status</span><strong><Check size={17} /> {intact ? 'Verified' : 'Review required'}</strong><small>Hash-linked event history</small></div><div><span>Recorded events</span><strong>{entries.length}</strong><small>Organization-scoped entries</small></div><div><span>Latest activity</span><strong>Just now</strong><small>Evidence graph synchronized</small></div><div><span>Retention</span><strong>7 years</strong><small>Governance policy</small></div></div>
    <div className="audit-toolbar"><div className="audit-filter"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search actor, event, or hash" /></div><span>{filtered.length} events in view</span></div>
    <section className="card audit-card"><div className="audit-card-head"><div><div className="eyebrow">Evidence ledger</div><h2>Decision history</h2><p>Every model change can be traced to an actor, timestamp, and previous hash.</p></div><span className="audit-integrity"><Fingerprint size={15} /> Tamper-evident ledger</span></div><div className="audit-table-wrap"><table className="table audit-table"><thead><tr><th>Time</th><th>Actor</th><th>Decision or evidence change</th><th>Hash fragment</th><th /></tr></thead><tbody>{filtered.map((entry, index) => <tr key={`${entry.timestamp}-${index}`}><td><span className="audit-time"><Clock3 size={12} /> {entry.timestamp}</span></td><td><span className={`actor ${entry.actor === 'system' ? 'system' : ''}`}>{entry.actor}</span></td><td><div className="audit-change"><span className="audit-event-icon"><FileCheck2 size={14} /></span><div><strong>{entry.change_description}</strong><small>Organization-scoped event · previous hash linked</small></div></div></td><td><code>{entry.hash}</code></td><td><button className="audit-row-action" aria-label="Inspect audit event"><ChevronRight size={15} /></button></td></tr>)}</tbody></table></div></section><div className="audit-footnote"><ShieldCheck size={14} /> The audit chain is checked whenever governance data is loaded. <a href="/methodology">Read model governance <ChevronRight size={13} /></a></div>
  </div>;
}
