'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, CircleGauge, Clock3, Database, ShieldCheck, Waypoints } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { TrendChart } from '@/components/charts';
import { useApp } from '@/components/app-provider';
import { eal, formatCr, getScenario, trendFor } from '@/lib/mock-data';
import { apiFetch } from '@/lib/api';
import { orgIdFor } from '@/lib/org';

type Point = { month: string; eal: number };
type Mix = { month: string; verified: number; configured: number; estimated: number };

function TrendSignal({ icon: Icon, label, value, detail, tone }: { icon: typeof ShieldCheck; label: string; value: string; detail: string; tone: string }) {
  return <div className="trend-signal"><span className={`trend-signal-icon ${tone}`}><Icon size={16} /></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

export default function Trends() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [history, setHistory] = useState<Point[]>(trendFor(org));
  const [mix, setMix] = useState({ verified: scenario.verified, configured: scenario.configured, estimated: scenario.estimated });

  useEffect(() => {
    Promise.all([apiFetch<Point[]>(`/api/v1/organizations/${orgIdFor(org)}/trends/eal-history`), apiFetch<Mix[]>(`/api/v1/organizations/${orgIdFor(org)}/trends/confidence-mix-history`)]).then(([e, m]) => { setHistory(e); const latest = m[m.length - 1]; if (latest) setMix(latest); }).catch(() => { setHistory(trendFor(org)); setMix(scenario); });
  }, [org, scenario]);

  const latest = history[history.length - 1]?.eal || eal / 10000000;
  const first = history[0]?.eal || latest;
  const peak = Math.max(...history.map(point => point.eal), latest);
  const change = latest - first;
  const changePercent = first ? Math.abs((change / first) * 100) : 0;
  const likelihood = Math.min(76, Math.max(21, 28 + scenario.criticalPaths * 1.1));
  const confidenceTotal = mix.verified + mix.configured + mix.estimated;
  const verifiedShare = Math.round((mix.verified / confidenceTotal) * 100);
  const latestMonth = history[history.length - 1]?.month || 'May';
  const modelNote = change <= 0 ? 'Exposure has improved since the first tracked run.' : 'Exposure is above the first tracked run and needs review.';
  const trendStatus = useMemo(() => change <= 0 ? 'Improving' : 'Needs attention', [change]);

  return <div className="content trends-page">
    <div className="trends-topline"><div className="page-heading-block"><PageHeader eyebrow="Overview · Quantification history" title="Risk progression" sub={`${org} · understand how exposure, likelihood, and evidence have moved over time.`} /></div><div className="trend-header-actions"><span className="live-pill"><i /> Live history</span><Link href="/reports" className="ghost">Open report <ChevronRight size={14} /></Link></div></div>

    <div className="trend-signals"><TrendSignal icon={CircleGauge} label="Average annual loss" value={formatCr(latest * 10000000)} detail={`Latest run · ${latestMonth}`} tone="indigo" /><TrendSignal icon={BarChart3} label="1-in-100 tail exposure" value={formatCr(186000000 * scenario.factor)} detail="Extreme modeled loss" tone="amber" /><TrendSignal icon={Waypoints} label="Annual event likelihood" value={`${likelihood.toFixed(1)}%`} detail="At least one material event" tone="red" /><TrendSignal icon={ShieldCheck} label="Evidence confidence" value={`${verifiedShare}%`} detail={`${Math.round(mix.verified)}% verified signals`} tone="green" /></div>

    <section className="trend-main-grid"><div className="card trend-history-card"><div className="trend-card-head"><div><div className="eyebrow">Financial exposure history</div><h2>Average annual loss</h2><p>How modeled EAL has changed across the last {history.length} quantification runs.</p></div><div className={`trend-status ${change <= 0 ? 'positive' : 'warning'}`}><i /> {trendStatus}</div></div><div className="trend-chart-legend"><span><i className="current" /> Current EAL</span><span><i className="baseline" /> First tracked run</span></div><TrendChart data={history} height={310} /><div className="chart-footnote"><span><Clock3 size={13} /> Latest quantification · {latestMonth} 2026</span><span>Peak exposure · {formatCr(peak * 10000000)}</span></div></div><aside className="trend-run-card card"><div className="eyebrow">Latest model run</div><div className="run-number">{formatCr(latest * 10000000)}</div><div className={`run-change ${change <= 0 ? 'positive' : 'warning'}`}><ArrowDownRight size={14} /> {changePercent.toFixed(1)}% vs first tracked run</div><div className="run-divider" /><div className="run-row"><span>Model status</span><strong><i className="status-dot" /> Calibrated</strong></div><div className="run-row"><span>Evidence quality</span><strong>{verifiedShare}% verified</strong></div><div className="run-row"><span>Scenario coverage</span><strong>{scenario.criticalPaths} critical paths</strong></div><p className="run-note">{modelNote}</p><Link href="/methodology" className="inline-action">How this is calculated <ChevronRight size={14} /></Link></aside></section>

    <div className="trends-section-title"><div><div className="eyebrow">Movement drivers</div><h2>What changed underneath the curve</h2></div><Link href="/audit-log" className="ghost">View audit trail <ChevronRight size={14} /></Link></div><section className="trend-driver-grid"><div className="card trend-driver"><span className="driver-icon blue"><Database size={16} /></span><div><span>Evidence progression</span><strong>{Math.round(mix.verified)}% verified</strong><p>Verified signals now account for {verifiedShare}% of the evidence mix.</p></div><ArrowUpRight size={15} className="driver-arrow" /></div><div className="card trend-driver"><span className="driver-icon green"><ShieldCheck size={16} /></span><div><span>Control posture</span><strong>Risk response improving</strong><p>Current controls are reducing expected loss across modeled attack paths.</p></div><ArrowDownRight size={15} className="driver-arrow positive" /></div><div className="card trend-driver"><span className="driver-icon purple"><Waypoints size={16} /></span><div><span>Attack surface</span><strong>{scenario.criticalPaths} open critical paths</strong><p>Prioritize high-impact nodes before the next quantification run.</p></div><Link href="/graph" className="driver-arrow"><ChevronRight size={15} /></Link></div></section>
  </div>;
}
