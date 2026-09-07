'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleCheck, Download, FileCheck2, Link2, ShieldAlert, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { compliance as fallback, frameworks, getScenario } from '@/lib/mock-data';
import { apiFetch } from '@/lib/api';
import { useApp } from '@/components/app-provider';
import { orgIdFor } from '@/lib/org';

type Matrix = { frameworks: string[]; rows: { control: string; values: boolean[]; equivalence_group: string | null }[] };

function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'green' | 'amber' }) {
  return <div className={`compliance-progress ${tone}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export default function Compliance() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const [active, setActive] = useState('All');
  const [notice, setNotice] = useState('');
  const [live, setLive] = useState<Matrix | null>(null);

  useEffect(() => {
    const query = active === 'All' ? '' : `?framework=${encodeURIComponent(active)}`;
    apiFetch<Matrix>(`/api/v1/organizations/${orgIdFor(org)}/compliance/matrix${query}`).then(setLive).catch(() => setLive(null));
  }, [org, active]);

  const rows = live?.rows || fallback.map(row => ({ control: row.control, values: row.values, equivalence_group: null }));
  const matrixFrameworks = live?.frameworks?.length ? live.frameworks : frameworks;
  const visible = active === 'All' ? matrixFrameworks : [active];
  const coverage = useMemo(() => {
    let covered = 0;
    let total = 0;
    visible.forEach(framework => {
      const index = matrixFrameworks.indexOf(framework);
      rows.forEach(row => { total += 1; if (row.values[index] ?? false) covered += 1; });
    });
    return { covered, total, percent: total ? Math.round((covered / total) * 100) : 0 };
  }, [matrixFrameworks, rows, visible]);

  const frameworkStats = matrixFrameworks.map((framework, index) => {
    const covered = rows.filter(row => row.values[index]).length;
    return { framework, covered, total: rows.length, percent: rows.length ? Math.round((covered / rows.length) * 100) : 0 };
  });
  const gaps = rows.filter(row => visible.some(framework => !(row.values[matrixFrameworks.indexOf(framework)] ?? false)));
  const verifiedEvidence = Math.round(scenario.verified * 0.78);
  const readiness = Math.round(coverage.percent * 0.82 + verifiedEvidence * 0.18);

  async function exportEvidence() {
    try { await apiFetch(`/api/v1/organizations/${orgIdFor(org)}/compliance/evidence-pack`, { method: 'POST' }); setNotice('Evidence pack prepared by the SecureX API.'); }
    catch { setNotice('Evidence pack prepared — fallback demo.'); }
  }

  return <div className="content compliance-page">
    <div className="compliance-topline"><div className="page-heading-block"><PageHeader eyebrow="Governance · continuous assurance" title="Compliance intelligence" sub={`${org} · map control evidence to obligations, quantify readiness, and act on the gaps that matter.`} /></div><div className="compliance-status"><span className="live-pill"><i /> Evidence graph current</span><span className="compliance-refresh">Refreshed {scenario.refreshDays}d ago</span></div></div>
    <div className="compliance-actions"><div className="framework-tabs"><button className={active === 'All' ? 'primary' : 'ghost'} onClick={() => setActive('All')}>All frameworks</button>{frameworks.map(framework => <button className={active === framework ? 'primary' : 'ghost'} onClick={() => setActive(framework)} key={framework}>{framework}</button>)}</div><button className="ghost export-button" onClick={exportEvidence}><Download size={14} /> Export evidence pack</button></div>
    {notice && <div className="compliance-notice"><CircleCheck size={15} /> {notice}</div>}
    <div className="compliance-metrics"><div><span>Readiness index</span><strong>{readiness}<em>/100</em></strong><small><Sparkles size={11} /> Evidence-weighted posture</small></div><div><span>Crosswalk coverage</span><strong>{coverage.percent}%</strong><small>{coverage.covered} of {coverage.total} mapped clauses</small></div><div><span>Verified evidence</span><strong>{verifiedEvidence}%</strong><small>Backed by tested control signals</small></div><div><span>Priority gaps</span><strong className="amber-number">{gaps.length}</strong><small>Across the selected scope</small></div></div>

    <section className="compliance-overview-grid"><div className="card compliance-readiness-card"><div className="compliance-card-head"><div><div className="eyebrow">Posture by framework</div><h2>One control graph, every obligation</h2><p>Coverage is normalized across frameworks so overlapping evidence is counted once.</p></div><div className="readiness-ring" style={{ '--ring-value': `${readiness * 3.6}deg` } as React.CSSProperties}><div><strong>{readiness}</strong><span>/100</span></div></div></div><div className="framework-list">{frameworkStats.map(item => <button className={`framework-row ${active === item.framework ? 'selected' : ''}`} onClick={() => setActive(item.framework)} key={item.framework}><span className="framework-name"><b>{item.framework.slice(0, 2).toUpperCase()}</b><strong>{item.framework}</strong></span><span className="framework-meter"><Progress value={item.percent} tone={item.percent > 65 ? 'green' : 'amber'} /><small>{item.covered}/{item.total} mapped</small></span><ChevronRight size={15} /></button>)}</div></div><aside className="card evidence-posture-card"><div className="eyebrow">Evidence posture</div><h2>Defensible, not just complete.</h2><p>Compliance confidence is weighted by the quality and freshness of the evidence behind each mapped control.</p><div className="evidence-score"><div className="evidence-score-label"><span>Verified controls</span><strong>{scenario.verified}%</strong></div><Progress value={scenario.verified} tone="green" /><div className="evidence-score-label"><span>Configured signals</span><strong>{scenario.configured}%</strong></div><Progress value={scenario.configured} tone="amber" /><div className="evidence-score-label"><span>Estimated coverage</span><strong>{scenario.estimated}%</strong></div><Progress value={scenario.estimated} /></div><div className="evidence-callout"><FileCheck2 size={16} /><span><strong>Audit-ready path</strong><small>Evidence refreshes with the risk model.</small></span></div></aside></section>

    <section className="card crosswalk-card"><div className="compliance-card-head crosswalk-head"><div><div className="eyebrow">Control crosswalk</div><h2>{active === 'All' ? 'Mapped control register' : `${active} control register`}</h2><p>Prioritize the gaps with the highest exposure, not simply the longest checklist.</p></div><span className="crosswalk-count"><ShieldAlert size={14} /> {gaps.length} open gaps</span></div><div className="crosswalk-table-wrap"><table className="table compliance-table"><thead><tr><th>Control evidence</th>{visible.map(framework => <th key={framework}>{framework}</th>)}<th>Signal</th></tr></thead><tbody>{rows.map((row, index) => { const indexes = visible.map(framework => matrixFrameworks.indexOf(framework)); const rowCovered = indexes.every(i => row.values[i] ?? false); return <tr key={row.control}><td><div className="compliance-control"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{row.control}</strong><small>{row.equivalence_group || 'Control family · mapped evidence'}</small></div></div></td>{indexes.map((valueIndex, j) => { const covered = row.values[valueIndex] ?? false; return <td key={j}>{covered ? <span className="coverage-state verified"><Check size={14} /> Covered</span> : <span className="coverage-state gap"><span /> Gap</span>}</td>; })}<td><span className={`signal-state ${rowCovered ? 'complete' : 'action'}`}>{rowCovered ? <><CircleCheck size={12} /> Ready</> : <><Link2 size={12} /> Remediate</>}</span></td></tr>; })}</tbody></table></div></section>
    <div className="compliance-footnote"><Link2 size={14} /> Equivalence logic: one verified control can satisfy multiple clauses when evidence scope overlaps. <a href="/methodology">View methodology <ChevronRight size={13} /></a></div>
  </div>;
}
