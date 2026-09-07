'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, CircleDollarSign, FlaskConical, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader, Toggle } from '@/components/ui';
import { controls, eal, formatCr, getScenario } from '@/lib/mock-data';
import { LossCurve } from '@/components/charts';
import { useApp } from '@/components/app-provider';
import { apiFetch } from '@/lib/api';

type Control = { id: string; name: string; category: string; impact: number; cost: number; on: boolean };
type Simulation = { eal: number; baseline_eal: number; delta: number; loss_curve: { x: string; y: number }[]; controls: Control[] };

export default function Simulator() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [items, setItems] = useState<Control[]>([]);
  const [state, setState] = useState(controls.map(c => c.on));
  const [result, setResult] = useState<Simulation | null>(null);
  const orgId = org === 'Asteria Finance' ? 'asteria-finance' : org === 'Northstar Microcredit' ? 'northstar-microcredit' : 'pragati-bank';

  useEffect(() => { apiFetch<Control[]>(`/api/v1/organizations/${orgId}/controls`).then(setItems).catch(() => {}); }, [orgId]);
  const localControls = items.length ? items : controls.map((c, i) => ({ id: ['mfa-privileged', 'segment-payment', 'edr-branches', 'encrypt-data', 'jit-admin', 'managed-detection'][i], ...c, impact: c.impact * scenario.factor }));
  const activeCount = state.filter(Boolean).length;
  const reduction = result ? -result.delta : localControls.reduce((sum, c, i) => sum + (state[i] ? c.impact : 0), 0);
  const baseline = result?.baseline_eal ?? eal * scenario.factor;
  const projected = result?.eal ?? baseline - reduction;
  const bestMove = useMemo(() => [...localControls].sort((a, b) => b.impact - a.impact)[0], [localControls]);

  const toggle = (index: number) => {
    const next = state.map((value, i) => i === index ? !value : value);
    setState(next);
    apiFetch<Simulation>(`/api/v1/organizations/${orgId}/simulate`, { method: 'POST', body: JSON.stringify({ toggled_control_ids: localControls.filter((_, i) => next[i]).map(c => c.id) }) }).then(setResult).catch(() => setResult(null));
  };

  return <div className="content simulator-page">
    <div className="simulator-topline"><div className="page-heading-block"><PageHeader eyebrow="Analysis · Scenario lab" title="What-if simulator" sub={`${org} · quantify the financial effect of control decisions before implementation.`} /></div><div className="scenario-status"><span className="live-pill"><i /> Model ready</span><span className="scenario-meta"><FlaskConical size={14} /> Scenario 04 · Unsaved</span></div></div>

    <div className="simulator-metrics"><div><span>Baseline EAL</span><strong>{formatCr(baseline)}</strong><small>Current modeled exposure</small></div><div><span>Projected EAL</span><strong className="green-text">{formatCr(projected)}</strong><small>With selected controls</small></div><div><span>Risk reduction</span><strong className="green-text"><ArrowDownRight size={16} /> {formatCr(reduction)}</strong><small>{baseline ? ((reduction / baseline) * 100).toFixed(1) : '0.0'}% of baseline exposure</small></div><div><span>Controls selected</span><strong>{String(activeCount).padStart(2, '0')} <em>/ {localControls.length}</em></strong><small>Toggle to recompute</small></div></div>

    <div className="simulator-layout">
      <section className="card control-portfolio"><div className="sim-card-head"><div><div className="eyebrow">Control portfolio</div><h2>Choose your investment scenario</h2><p>Each control is ranked by its modeled reduction in annual loss.</p></div><span className="portfolio-filter">All controls <ChevronRight size={13} /></span></div><div className="control-table-head"><span>Control / domain</span><span>Current state</span><span>Impact</span><span /></div><div className="control-rows">{localControls.map((control, index) => <div className={`sim-control-row ${state[index] ? 'selected' : ''}`} key={control.id}><div className="control-title"><span className="control-check">{state[index] ? <Check size={13} /> : <ShieldCheck size={13} />}</span><div><strong>{control.name}</strong><small>{control.category}</small></div></div><div className="maturity-state"><span className={state[index] ? 'state-active' : 'state-off'}>{state[index] ? 'Included' : 'Not included'}</span><small>{state[index] ? 'Current plan' : 'Available'}</small></div><div className="impact-cell"><strong>↓ {formatCr(control.impact)}</strong><small>annual loss</small></div><Toggle on={state[index]} onClick={() => toggle(index)} /></div>)}</div><div className="portfolio-foot"><span><CircleDollarSign size={14} /> Values are modeled estimates, not implementation quotes.</span><a href="/methodology">Read methodology <ChevronRight size={13} /></a></div></section>

      <aside className="simulator-side"><section className="card outcome-card"><div className="sim-card-head compact"><div><div className="eyebrow">Scenario outcome <span className="tag verified" style={{ marginLeft: 7 }}>LIVE API</span></div><h2>Projected exposure</h2></div><Sparkles size={16} className="outcome-spark" /></div><div className="outcome-number tabular">{formatCr(projected)}</div><div className="outcome-delta"><ArrowDownRight size={15} /> <strong>{formatCr(reduction)}</strong> lower than baseline</div><div className="outcome-chart"><LossCurve reduction={reduction} /></div><div className="outcome-note"><span><ShieldCheck size={14} /> Recomputed from {activeCount} selected controls</span><span>Model confidence · {scenario.verified}% verified</span></div></section><section className="card recommendation-card"><div className="eyebrow">Highest-impact next move</div><h3>{bestMove?.name || 'Privileged access hardening'}</h3><p>{bestMove?.category || 'Identity'} is currently the most efficient lever in this scenario.</p><div className="recommendation-value"><span>Projected reduction</span><strong>↓ {formatCr(bestMove?.impact || 0)}</strong></div><a href="#controls">Review control <ArrowUpRight size={14} /></a></section><button className="primary save-scenario" onClick={() => alert('Scenario saved to the SecureX API demo workspace.')}><Save size={15} /> Save this scenario</button></aside>
    </div>
  </div>;
}
