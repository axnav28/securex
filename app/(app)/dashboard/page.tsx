'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert, Clock3, ExternalLink, ShieldCheck, Sparkles, Target, Waypoints } from 'lucide-react';
import { PageHeader, Tag, Toggle } from '@/components/ui';
import { eal, formatCr, nodes, controls, getScenario, Node } from '@/lib/mock-data';
import { LossCurve } from '@/components/charts';
import { useApp } from '@/components/app-provider';
import { apiFetch } from '@/lib/api';

type Summary = { org: string; eal: number; var99: number; criticalPaths: number; refreshDays: number; trendDelta: number; confidence: { verified: number; configured: number; estimated: number } };
const factorRows = [
  { label: 'Identity & privileged access', value: 31, tone: 'critical', note: '4 exposed paths' },
  { label: 'Third-party connectivity', value: 24, tone: 'high', note: '2 concentration risks' },
  { label: 'Cloud configuration', value: 18, tone: 'medium', note: '7 open findings' },
  { label: 'Endpoint resilience', value: 12, tone: 'low', note: 'Evidence improving' },
];

function ScoreRing({ value }: { value: number }) { return <div className="posture-ring" style={{ '--ring-value': `${value * 3.6}deg` } as React.CSSProperties}><div><strong>{value}</strong><span>/ 100</span></div></div>; }
function Signal({ icon: Icon, label, value, detail, tone = 'indigo' }: { icon: typeof ShieldCheck; label: string; value: string; detail: string; tone?: string }) { return <div className="signal-card"><span className={`signal-icon ${tone}`}><Icon size={16} /></span><div><span className="signal-label">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }

export default function Dashboard() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [on, setOn] = useState(controls[0].on);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [liveNodes, setLiveNodes] = useState<Node[]>([]);

  useEffect(() => {
    const id = org === 'Asteria Finance' ? 'asteria-finance' : org === 'Northstar Microcredit' ? 'northstar-microcredit' : 'pragati-bank';
    Promise.all([apiFetch<Summary>(`/api/v1/organizations/${id}/risk-summary`), apiFetch<Node[]>(`/api/v1/organizations/${id}/top-risk-contributors`)]).then(([s, n]) => { setSummary(s); setLiveNodes(n); }).catch(() => { setSummary(null); setLiveNodes([]); });
  }, [org]);

  const data = summary || { org, eal: eal * scenario.factor, var99: 186000000 * scenario.factor, criticalPaths: scenario.criticalPaths, refreshDays: scenario.refreshDays, trendDelta: -7.4, confidence: { verified: scenario.verified, configured: scenario.configured, estimated: scenario.estimated } };
  const list = liveNodes.length ? liveNodes : nodes.slice(0, 5);
  const current = data.eal - (on ? controls[0].impact * scenario.factor : 0);
  const posture = Math.max(0, Math.min(100, Math.round(100 - (current / (data.var99 || 1)) * 48)));
  const evidenceTotal = data.confidence.verified + data.confidence.configured + data.confidence.estimated;
  const verifiedShare = Math.round((data.confidence.verified / evidenceTotal) * 100);
  const highestRisk = useMemo(() => list[0]?.name || 'Identity gateway', [list]);

  return <div className="content dashboard-page">
    <div className="dashboard-topline"><PageHeader eyebrow="Executive command centre · Live exposure" title="Good morning, Arnav." sub={`${org} · refreshed just now`} /><div className="dashboard-actions"><span className="live-pill"><i /> Live model</span><Link href="/reports" className="ghost"><ExternalLink size={14} /> Export report</Link></div></div>
    <section className="posture-grid">
      <div className="card posture-card"><div className="posture-copy"><div className="eyebrow">Current risk posture <span className="tag verified" style={{ marginLeft: 7 }}>LIVE API</span></div><div className="headline-number tabular">{formatCr(current)}</div><div className="posture-change"><ArrowDownRight size={14} /> 7.4% lower than last month</div><p>Expected annual loss across your modeled exposure paths.</p><div className="benchmark"><span>Gordon–Loeb ceiling</span><strong>{formatCr(data.eal * 0.37)}</strong><small>37% of expected loss</small></div></div><div className="posture-score"><ScoreRing value={posture} /><span>SecureX posture</span><small>Higher is better</small></div></div>
      <div className="card evidence-card"><div className="card-kicker"><ShieldCheck size={15} /> Evidence quality</div><div className="evidence-number">{verifiedShare}% <span>verified</span></div><div className="confidence-bar"><i className="v" style={{ width: `${data.confidence.verified}%` }} /><i className="c" style={{ width: `${data.confidence.configured}%` }} /><i className="e" style={{ width: `${data.confidence.estimated}%` }} /></div><div className="evidence-legend"><span><i className="dot v" /> {data.confidence.verified}% Verified</span><span><i className="dot c" /> {data.confidence.configured}% Configured</span><span><i className="dot e" /> {data.confidence.estimated}% Estimated</span></div><Link href="/graph" className="inline-action">Review evidence <ChevronRight size={14} /></Link></div>
    </section>
    <div className="signal-grid"><Signal icon={CircleAlert} label="Open critical paths" value={String(data.criticalPaths).padStart(2, '0')} detail="2 fewer since refresh" tone="red" /><Signal icon={Target} label="Tail exposure · 1-in-100" value={formatCr(data.var99)} detail="Worst-case modeled loss" tone="amber" /><Signal icon={Waypoints} label="Attack surface" value="184 assets" detail={`${highestRisk} is the top contributor`} tone="blue" /><Signal icon={Clock3} label="Graph freshness" value={`${String(data.refreshDays).padStart(2, '0')} days`} detail="Next refresh in 4 days" tone="green" /></div>
    <div className="dashboard-section-title"><div><div className="eyebrow">Risk intelligence</div><h2>See what is moving the number</h2></div><Link href="/trends" className="ghost">View full history <ChevronRight size={14} /></Link></div>
    <section className="intelligence-grid"><div className="card chart-card risk-chart-card"><div className="section-head"><div><h2>Loss exceedance curve</h2><span>Probability of exceeding potential loss</span></div><span className="chart-legend"><i /> Current exposure</span></div><LossCurve reduction={on ? controls[0].impact * scenario.factor : 0} /></div><div className="card factors-card"><div className="section-head"><div><h2>Risk factor contribution</h2><span>Share of modeled EAL</span></div><Link href="/optimizer" className="icon-link"><ArrowUpRight size={15} /></Link></div><div className="factor-list">{factorRows.map(row => <div className="factor-row" key={row.label}><div className="factor-meta"><strong>{row.label}</strong><span>{row.value}%</span></div><div className="factor-track"><i className={row.tone} style={{ width: `${row.value * 2.4}%` }} /></div><small>{row.note}</small></div>)}</div><div className="factor-footer"><span><i className="dot" /> Prioritized by EAL impact</span><Link href="/optimizer">Find a fix <ChevronRight size={13} /></Link></div></div><div className="card event-card"><div className="section-head"><div><h2>Loss event mix</h2><span>Expected annual loss by scenario</span></div><Link href="/reports" className="icon-link"><ArrowUpRight size={15} /></Link></div><div className="event-visual"><div className="event-donut"><div><strong>100%</strong><span>modeled</span></div></div><div className="event-legend"><div><i className="breach" /><span>Data breach</span><strong>73%</strong></div><div><i className="ransom" /><span>Ransomware</span><strong>19%</strong></div><div><i className="outage" /><span>Service interruption</span><strong>5%</strong></div><div><i className="thirdparty" /><span>Third-party</span><strong>3%</strong></div></div></div><div className="event-footer"><span>Largest driver</span><strong>Data breach · {formatCr(current * .73)}</strong></div></div></section>
    <section className="card table-card contributors-card"><div className="section-head section-pad"><div><div className="eyebrow">Exposure inventory</div><h2>Top risk contributors</h2><span>Assets and paths with the highest expected loss impact</span></div><Link href="/graph" className="ghost">Open attack graph <ChevronRight size={14} /></Link></div><table className="table"><thead><tr><th>#</th><th>Asset / path</th><th>Evidence state</th><th>Priority</th><th style={{ textAlign: 'right' }}>EAL contribution</th></tr></thead><tbody>{list.map((n, i) => <tr key={n.id}><td className="rank">{String(i + 1).padStart(2, '0')}</td><td><div className="risk-name">{n.name}</div><div className="risk-type">{n.type}</div></td><td><Tag value={n.confidence} /></td><td><span className={`priority-dot ${i < 2 ? 'high' : 'medium'}`} /> {i < 2 ? 'Immediate' : 'Monitor'}</td><td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular">{formatCr(n.risk)}</td></tr>)}</tbody></table></section>
    <section className="card action-card"><div><div className="eyebrow"><Sparkles size={12} /> Decision preview</div><h2>What if you fund the highest-impact fix?</h2><p>Model the control before it reaches your budget. The estimate updates the exposure curve and posture score instantly.</p></div><div className="action-control"><div><strong>{controls[0].name}</strong><small>Estimated reduction · ↓ {formatCr(controls[0].impact * scenario.factor)}</small></div><Toggle on={on} onClick={() => setOn(!on)} /></div><Link href="/simulator" className="primary">Open full simulator <ChevronRight size={15} /></Link></section>
  </div>;
}
