'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleDollarSign, Gauge, Layers3, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { controls, formatCr, getScenario } from '@/lib/mock-data';
import { Frontier } from '@/components/charts';
import { useApp } from '@/components/app-provider';
import { apiFetch } from '@/lib/api';
import { orgIdFor } from '@/lib/org';

type Recommendation = { name: string; category: string; cost: number; impact: number; paths: string[]; deduplicated: boolean };
type RecResponse = { ceiling: number; recommendations: Recommendation[] };

function SummaryTile({ icon: Icon, label, value, detail, tone = 'indigo' }: { icon: typeof Target; label: string; value: string; detail: string; tone?: string }) { return <div className="optimizer-tile"><span className={`optimizer-tile-icon ${tone}`}><Icon size={16} /></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }

export default function Optimizer() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [budget, setBudget] = useState(100);
  const [live, setLive] = useState<RecResponse | null>(null);
  const orgId = orgIdFor(org);
  useEffect(() => { apiFetch<RecResponse>(`/api/v1/organizations/${orgId}/optimizer/recommendations?budget=${budget}`).then(setLive).catch(() => setLive(null)); }, [orgId, budget]);
  const rec = live?.recommendations || controls.filter(control => control.impact / control.cost > .000002).slice(0, 4).map(control => ({ name: control.name, category: control.category, cost: control.cost, impact: control.impact * scenario.factor, paths: ['Payment → Core DB'], deduplicated: true }));
  const ceiling = live?.ceiling || 15800000 * scenario.factor * .37;
  const modeledReduction = Math.min(63, budget / 1580 * 63);
  const best = rec[0];

  return <div className="content optimizer-page">
    <div className="optimizer-topline"><div className="page-heading-block"><PageHeader eyebrow="Analysis · Capital allocation" title="Investment optimizer" sub={`${org} · find the highest-leverage combination of fixes without double-counting shared paths.`} /></div><div className="optimizer-status"><span className="live-pill"><i /> Quantification ready</span><span className="model-note"><ShieldCheck size={14} /> Overlap-safe model</span></div></div>

    <div className="optimizer-tiles"><SummaryTile icon={CircleDollarSign} label="Scenario budget" value={`₹${(budget / 100).toFixed(2)} Cr`} detail="Selected investment envelope" /><SummaryTile icon={ArrowDownRight} label="Modeled reduction" value={`${modeledReduction.toFixed(1)}%`} detail="At current budget" tone="green" /><SummaryTile icon={Gauge} label="Gordon–Loeb ceiling" value={formatCr(ceiling)} detail="37% of expected loss" tone="amber" /><SummaryTile icon={Layers3} label="Recommended controls" value={String(rec.length).padStart(2, '0')} detail={live ? 'Live API recommendations' : 'Seeded model recommendations'} tone="blue" /></div>

    <section className="optimizer-model-grid"><div className="card frontier-card"><div className="optimizer-card-head"><div><div className="eyebrow">Capital allocation curve</div><h2>Scenario budget</h2><p>Drag the budget to see the marginal risk reduction at each investment level.</p></div><div className="budget-readout"><span>Selected</span><strong>₹{(budget / 100).toFixed(2)} Cr</strong></div></div><input className="range optimizer-range" type="range" min="0" max="1580" value={budget} onChange={event => setBudget(Number(event.target.value))} /><div className="range-labels"><span>₹0 Cr</span><span>Gordon–Loeb ceiling · {formatCr(ceiling)}</span><span>₹15.80 Cr</span></div><Frontier budget={budget} /></div><aside className="card allocation-card"><div className="eyebrow">Allocation guidance</div><h2>Fund the highest-leverage control first.</h2><p>The model prioritizes controls by expected financial reduction, cost, and unique attack paths closed.</p><div className="allocation-highlight"><span>Best next move</span><strong>{best?.name || 'Privileged access hardening'}</strong><small>↓ {formatCr(best?.impact || 0)} modeled annual loss</small></div><div className="allocation-row"><span>Budget utilization</span><strong>{Math.min(100, (budget / 1580) * 100).toFixed(0)}%</strong></div><div className="allocation-row"><span>Unique path coverage</span><strong>{Math.min(94, 38 + modeledReduction).toFixed(0)}%</strong></div><Link href="/simulator" className="primary allocation-action"><Sparkles size={14} /> Test this plan <ChevronRight size={14} /></Link></aside></section>

    <section className="card recommendations-card"><div className="optimizer-card-head recommendation-head"><div><div className="eyebrow">Quantified mitigation plan</div><h2>Top recommended actions</h2><p>Current maturity, target state, and financial effect of each control upgrade.</p></div><span className="api-status"><i /> {live ? 'LIVE API' : 'MODEL FALLBACK'} · de-duplicated</span></div><div className="recommendation-table-wrap"><table className="table recommendation-table"><thead><tr><th>Control recommendation</th><th>Current → target</th><th>Average loss reduction</th><th>Tail loss reduction</th><th>Investment</th><th /></tr></thead><tbody>{rec.map((control, index) => { const tail = control.impact * 1.65; const roi = control.cost ? control.impact / control.cost : 0; return <tr key={control.name}><td><div className="recommendation-name"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{control.name}</strong><small>{control.category} · {control.paths[0]}</small></div></div></td><td><div className="maturity-pair"><span>Level {Math.min(4, 2 + (index % 2))}</span><ArrowUpRight size={12} /><strong>Level 4</strong></div></td><td><strong className="green-value">↓ {formatCr(control.impact)}</strong><small>{((control.impact / (15800000 * scenario.factor)) * 100).toFixed(1)}% of modeled EAL</small></td><td><strong className="green-value">↓ {formatCr(tail)}</strong><small>1-in-100 scenario</small></td><td><strong>{formatCr(control.cost)}</strong><small>{roi.toFixed(1)}× modeled return</small></td><td><Link href="/simulator" className="row-action" aria-label={`Model ${control.name}`}><ArrowUpRight size={15} /></Link></td></tr>; })}</tbody></table></div></section><div className="optimizer-footnote"><ShieldCheck size={14} /> Shared attack-path reductions are credited once across the recommendation set. <Link href="/methodology">View methodology <ChevronRight size={13} /></Link></div>
  </div>;
}
