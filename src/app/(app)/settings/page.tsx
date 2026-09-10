'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Check, Database, ExternalLink, Gauge, Moon, RefreshCw, ShieldCheck, SlidersHorizontal, Sun, Zap } from 'lucide-react';
import { PageHeader, Toggle } from '@/components/ui';
import { getScenario } from '@/lib/mock-data';
import { useApp, useTheme } from '@/components/app-provider';
import { apiFetch } from '@/lib/api';
import { orgIdFor } from '@/lib/org';

type Integration = { id: string; provider_name: string; status: 'connected' | 'not_connected' };
const integrationMeta: Record<string, { category: string; description: string; color: string }> = {
  qualys: { category: 'Vulnerability intelligence', description: 'Asset and CVE posture signals', color: '#0f766e' },
  tenable: { category: 'Exposure management', description: 'Continuous exposure and asset context', color: '#4f46e5' },
  splunk: { category: 'Detection telemetry', description: 'Event and detection coverage', color: '#c2410c' },
  crowdstrike: { category: 'Endpoint security', description: 'EDR control effectiveness signals', color: '#be123c' },
};

export default function Settings() {
  const { org } = useApp();
  const scenario = getScenario(org);
  const { dark, setDark } = useTheme();
  const [tier, setTier] = useState(true);
  const [cadence, setCadence] = useState('Every 3 days');
  const [items, setItems] = useState<Integration[]>([]);
  useEffect(() => { apiFetch<Integration[]>(`/api/v1/organizations/${orgIdFor(org)}/integrations`).then(setItems).catch(() => setItems(['Qualys', 'Tenable', 'Splunk', 'CrowdStrike'].map((provider_name, i) => ({ id: provider_name.toLowerCase(), provider_name, status: i < 2 ? 'connected' : 'not_connected' })))); }, [org]);
  const connected = useMemo(() => items.filter(item => item.status === 'connected').length, [items]);
  const evidence = Math.round(scenario.verified + scenario.configured * .35);
  const toggle = async (item: Integration) => { const status = item.status === 'connected' ? 'not_connected' : 'connected'; setItems(items.map(current => current.id === item.id ? { ...current, status } : current)); try { await apiFetch(`/api/v1/organizations/${orgIdFor(org)}/integrations/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); } catch { /* optimistic demo state remains visible */ } };

  return <div className="content settings-page"><div className="settings-topline"><div className="page-heading-block"><PageHeader eyebrow="Workspace · configuration" title="Settings" sub={`${org} · connect evidence sources and tune how SecureX models your exposure.`} /></div><span className="settings-status"><i /> Workspace healthy</span></div>
    <div className="settings-metrics"><div><span>Connected sources</span><strong>{connected}<em>/{items.length || 4}</em></strong><small><Activity size={11} /> Live telemetry feeds</small></div><div><span>Evidence coverage</span><strong>{evidence}%</strong><small>Verified and configured signals</small></div><div><span>Model refresh</span><strong>{scenario.refreshDays}d</strong><small>Current organization cadence</small></div><div><span>Workspace tier</span><strong>{tier ? 'Enterprise' : 'MSME-Lite'}</strong><small>{tier ? 'Full telemetry profile' : 'Lean connector profile'}</small></div></div>
    <section className="settings-grid"><div className="card integrations-card"><div className="settings-card-head"><div><div className="eyebrow">Continuous control monitoring</div><h2>Evidence sources</h2><p>Connect the systems that keep financial exposure current as control posture changes.</p></div><span className="api-status"><i /> LIVE API</span></div><div className="integration-list">{items.map(item => { const meta = integrationMeta[item.id] || { category: 'Security telemetry', description: 'Evidence connector', color: 'var(--accent)' }; return <div className={`integration-row ${item.status === 'connected' ? 'is-connected' : ''}`} key={item.id}><span className="integration-logo" style={{ '--integration-color': meta.color } as React.CSSProperties}>{item.provider_name.slice(0, 1)}</span><div className="integration-copy"><strong>{item.provider_name}</strong><small>{meta.category} · {meta.description}</small></div><span className={`integration-state ${item.status}`}><i /> {item.status === 'connected' ? 'Connected' : 'Available'}</span><Toggle on={item.status === 'connected'} onClick={() => toggle(item)} /></div>; })}</div><a className="settings-link" href="/methodology">Understand evidence semantics <ExternalLink size={13} /></a></div><aside className="settings-side"><div className="card posture-settings-card"><div className="eyebrow">Workspace posture</div><h2>Evidence that keeps risk current.</h2><p>SecureX recalculates modeled exposure when connected control signals change.</p><div className="settings-ring" style={{ '--ring-value': `${Math.min(evidence, 100) * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.min(evidence, 100)}</strong><span>evidence index</span></div></div><div className="posture-setting-row"><span>Refresh cadence</span><strong>{cadence}</strong></div><div className="posture-setting-row"><span>Org scope</span><strong>Isolated</strong></div></div><div className="card theme-settings-card"><div className="theme-row"><span className="theme-icon"><>{dark ? <Moon size={15} /> : <Sun size={15} />}</></span><div><strong>Interface theme</strong><small>{dark ? 'Dark workspace' : 'Light workspace'} · saved to this browser</small></div><Toggle on={dark} onClick={() => setDark(!dark)} /></div></div></aside></section>
    <section className="card model-settings-card"><div className="settings-card-head"><div><div className="eyebrow">Risk model controls</div><h2>Keep the model in sync with reality.</h2><p>Choose how often SecureX should refresh the evidence graph and recalculate exposure.</p></div><span className="model-health"><ShieldCheck size={14} /> Overlap-safe model</span></div><div className="model-controls"><div className="cadence-options">{['Every hour', 'Every 3 days', 'Weekly'].map(option => <button className={cadence === option ? 'selected' : ''} onClick={() => setCadence(option)} key={option}><RefreshCw size={14} /> {option}{cadence === option && <Check size={13} />}</button>)}</div><div className="model-control-note"><Zap size={15} /><span><strong>Automatic invalidation enabled</strong><small>Control changes trigger a fresh risk calculation instead of serving stale cached results.</small></span></div></div></section>
    <div className="settings-footnote"><Database size={14} /> Configuration is organization-scoped and changes are recorded in the <a href="/audit-log">audit log <ExternalLink size={12} /></a>.</div>
  </div>;
}
