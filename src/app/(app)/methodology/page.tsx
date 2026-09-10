'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Database, Gauge, GitBranch, Info, ShieldCheck } from 'lucide-react';
import { PageHeader, Tag } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { useApp } from '@/components/app-provider';
import { orgIdFor } from '@/lib/org';

type Method = { intended_use: string; limitations: string[]; brier_score: number; next_review_date: string };

export default function Methodology() {
  const { org } = useApp();
  const [data, setData] = useState<Method | null>(null);
  useEffect(() => { apiFetch<Method>(`/api/v1/organizations/${orgIdFor(org)}/methodology`).then(setData).catch(() => setData(null)); }, [org]);
  const m = data || { intended_use: 'Decision support for security investment prioritization and board communication.', limitations: ['Small Indian enterprise calibration dataset', 'EPSS is a probability signal, not an incident forecast'], brier_score: .14, next_review_date: '2026-12-15' };

  return <div className="content methodology-page"><div className="methodology-topline"><div className="page-heading-block"><PageHeader eyebrow="Governance · model card" title="Methodology" sub="How SecureX turns uncertain signals into a decision-grade risk estimate." /></div><span className="model-version"><i /> Model v2.4 · production</span></div>
    <div className="method-metrics"><div><span>Calibration score</span><strong>{m.brier_score.toFixed(2)}</strong><small>Lower is better · Brier score</small></div><div><span>Model review</span><strong>{m.next_review_date}</strong><small>Next scheduled review</small></div><div><span>Quantification mode</span><strong>Monte Carlo</strong><small>10,000 simulated outcomes</small></div><div><span>Scope</span><strong>Org-scoped</strong><small>{org} · evidence-aware</small></div></div>
    <section className="method-pipeline card"><div className="method-card-head"><div><div className="eyebrow">Model architecture</div><h2>From signal to financial decision</h2><p>A transparent chain from observed evidence to expected annual loss and recommended action.</p></div><span className="method-chip"><ShieldCheck size={14} /> Explainable by design</span></div><div className="method-steps"><div><span className="step-index">01</span><Database size={18} /><strong>Ingest signals</strong><p>Assets, controls, CVEs, EPSS, and business context enter the evidence graph.</p></div><ArrowRight className="method-arrow" size={18} /><div><span className="step-index">02</span><GitBranch size={18} /><strong>Map attack paths</strong><p>Reachability and shared nodes model how one weakness can affect multiple scenarios.</p></div><ArrowRight className="method-arrow" size={18} /><div><span className="step-index">03</span><Gauge size={18} /><strong>Quantify exposure</strong><p>Monte Carlo simulations produce average loss, tail loss, and confidence bands.</p></div><ArrowRight className="method-arrow" size={18} /><div><span className="step-index">04</span><ShieldCheck size={18} /><strong>Prioritize action</strong><p>Controls are ranked by reduction in financial exposure, cost, and unique paths closed.</p></div></div></section>
    <div className="method-detail-grid"><section className="card method-detail-card"><div className="eyebrow">Evidence semantics</div><h2>Confidence is part of the number.</h2><p>SecureX keeps observed control state separate from analyst assumptions so decision-makers can see what supports each result.</p><div className="method-evidence-row"><Tag value="Verified" /><span>Tested behavior confirms the control blocks a path.</span><b>High</b></div><div className="method-evidence-row"><Tag value="Configured" /><span>Scanner or connector reports the current state.</span><b>Medium</b></div><div className="method-evidence-row"><Tag value="Estimated" /><span>Analyst judgement or questionnaire input.</span><b>Directional</b></div></section><section className="card method-detail-card"><div className="eyebrow">Intended use</div><h2>Decision support, not a forecast.</h2><p>{m.intended_use}</p><div className="method-note"><Info size={15} /><span><strong>Interpretation</strong><small>Use the output to compare investment choices and communicate exposure. It is not a prediction of a specific incident.</small></span></div><div className="method-limitations"><strong>Known limitations</strong>{m.limitations.map(item => <div key={item}><Check size={13} /> {item}</div>)}</div></section></div>
    <div className="method-footnote"><ShieldCheck size={14} /> Governance owner: Risk Science · Review cadence: quarterly · <a href="/audit-log">Open audit history <ArrowRight size={13} /></a></div>
  </div>;
}
