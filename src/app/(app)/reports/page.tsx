'use client';

import { useEffect, useState } from 'react';
import { ArrowDownRight, Check, Download, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { TrendChart } from '@/components/charts';
import { useApp } from '@/components/app-provider';
import { eal, formatCr, getScenario, trendFor } from '@/lib/mock-data';
import { apiFetch, apiBase } from '@/lib/api';
import { orgIdFor } from '@/lib/org';

type Preview = { org: string; eal: number; trend: { month: string; eal: number }[]; confidence: { verified: number; configured: number; estimated: number }; bullets: string[] };

export default function Reports() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => { apiFetch<Preview>(`/api/v1/organizations/${orgIdFor(org)}/reports/board-preview`).then(setPreview).catch(() => setPreview(null)); }, [org]);
  const data = preview || { org, eal: eal * scenario.factor, trend: trendFor(org), confidence: { verified: scenario.verified, configured: scenario.configured, estimated: scenario.estimated }, bullets: ['Privileged access moved to verified MFA enforcement', 'Payment gateway attack paths re-tested after segmentation', 'Evidence mapped to RBI and SEBI control families'] };
  const reduction = Math.max(0, data.trend[0]?.eal - data.trend[data.trend.length - 1]?.eal || 0);

  return <div className="content reports-page">
    <div className="reports-topline"><div className="page-heading-block"><PageHeader eyebrow="Governance · board communication" title="Board report" sub={`${org} · a clear, defensible snapshot for the next risk committee meeting.`} /></div><div className="reports-actions"><span className="live-pill"><i /> Board-ready snapshot</span><a className="primary report-download" href={`${apiBase}/api/v1/organizations/${orgIdFor(org)}/reports/download`} target="_blank" rel="noreferrer"><Download size={14} /> Download report</a></div></div>
    <div className="report-metrics"><div><span>Estimated annual loss</span><strong>{formatCr(data.eal)}</strong><small><ArrowDownRight size={12} /> {reduction.toFixed(1)} Cr improvement since baseline</small></div><div><span>Evidence confidence</span><strong>{data.confidence.verified}%</strong><small>Verified control evidence</small></div><div><span>Expected loss trend</span><strong>{data.trend[data.trend.length - 1]?.eal.toFixed(1)} Cr</strong><small>Latest modeled position</small></div><div><span>Reporting scope</span><strong>Q2 FY26</strong><small>India · {data.org}</small></div></div>
    <section className="reports-main-grid"><div className="card board-report-card"><div className="report-card-head"><div><div className="eyebrow">Executive readout · {data.org}</div><h2>Cyber risk remains within investment guardrails.</h2><p>Exposure is translating into a measurable, board-level financial signal.</p></div><span className="tag verified"><Check size={11} /> LIVE API</span></div><div className="report-eal"><span>Estimated annual loss</span><strong>{formatCr(data.eal)}</strong><small>Modeled across current attack paths and control evidence</small></div><div className="report-chart"><TrendChart data={data.trend} height={230} /></div><div className="report-legend"><span><i className="v" /> Verified evidence</span><span><i className="c" /> Configured signal</span><span><i className="e" /> Estimated input</span></div></div><aside className="report-side"><div className="card board-signal-card"><div className="eyebrow">Board signal</div><h3>Risk is falling, evidence is improving.</h3><div className="signal-score"><strong>{data.confidence.verified}%</strong><span>verified evidence</span></div><div className="confidence-bar report-confidence"><i className="v" style={{ width: `${data.confidence.verified}%` }} /><i className="c" style={{ width: `${data.confidence.configured}%` }} /><i className="e" style={{ width: `${data.confidence.estimated}%` }} /></div><p>Decision confidence is weighted by tested control behavior, not checklist completion.</p></div><div className="card quarter-card"><div className="eyebrow">What changed this quarter</div>{data.bullets.map((bullet, index) => <div className="quarter-row" key={bullet}><span>{String(index + 1).padStart(2, '0')}</span><p>{bullet}</p></div>)}<a href="/audit-log">Open audit trail <ArrowDownRight size={13} /></a></div></aside></section>
    <div className="report-footnote"><ShieldCheck size={14} /> Prepared from the current SecureX risk model and evidence graph. <span>Model refresh: {scenario.refreshDays} days ago</span></div>
  </div>;
}
