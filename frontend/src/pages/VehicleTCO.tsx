import React, { useState, useEffect, useMemo } from 'react';
import { PoundSterling, Truck, TrendingUp, Wrench, Search, ChevronDown, ChevronUp, Loader, AlertCircle, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { API_BASE_URL } from '../config/api';
import { isUserRestricted, getDefaultTradeGroup, getAvailableTradeGroups } from '../config/tradeMapping';

const C = {
  blue:       '#27549D',
  blueDark:   '#17325E',
  blueLight:  '#7099DB',
  blueSubtle: '#F7F9FD',
  yellow:     '#F1FF24',
  green:      '#2EB844',
  orange:     '#F29630',
  red:        '#D15134',
  teal:       '#0891B2',
  title:      '#1A1D23',
  body:       '#323843',
  subtle:     '#646F86',
  caption:    '#848EA3',
  border:     '#CDD1DA',
  bg:         '#F3F4F6',
  white:      '#FFFFFF',
};

const fmt = (n: number) =>
  '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) => n.toFixed(1) + '%';

interface VehicleFinancial {
  van_number: string;
  registration: string;
  vehicle_name: string;
  trade_group: string;
  identifier: string;
  capital_cost: number;
  service_cost: number;
  maintenance_cost: number;
  total_operations_cost: number;
  total_cost: number;
  cost_breakdown: Record<string, number>;
  cost_percentage: { capital: number; service: number; maintenance: number };
}

interface ApiResponse {
  success: boolean;
  summary: {
    total_vehicles_with_costs: number;
    total_fleet_capital_cost: number;
    total_fleet_service_cost: number;
    total_fleet_maintenance_cost: number;
    total_fleet_cost: number;
    fleet_cost_percentage: { capital: number; operations: number; service: number; maintenance: number };
  };
  vehicles: VehicleFinancial[];
  insights: {
    highest_cost_van: VehicleFinancial | null;
    money_where: string;
  };
}

type SortKey = 'total' | 'lease' | 'service' | 'maintenance';

// Stacked horizontal bar showing 3 cost segments
function CostBar({ lease, service, maintenance, total }: { lease: number; service: number; maintenance: number; total: number }) {
  if (total === 0) return <div style={{ height: 10, backgroundColor: C.bg, borderRadius: 4 }} />;
  const lp = (lease / total) * 100;
  const sp = (service / total) * 100;
  const mp = (maintenance / total) * 100;
  return (
    <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', gap: 1, minWidth: 120 }}>
      {lp > 0 && <div style={{ flex: lp, backgroundColor: C.blue }} title={`Lease: ${pct(lp)}`} />}
      {sp > 0 && <div style={{ flex: sp, backgroundColor: C.teal }} title={`Service: ${pct(sp)}`} />}
      {mp > 0 && <div style={{ flex: mp, backgroundColor: C.orange }} title={`Maintenance: ${pct(mp)}`} />}
    </div>
  );
}

export default function VehicleTCO() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('total');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState('');
  const [userIsRestricted, setUserIsRestricted] = useState(false);
  const [restrictedTradeGroup, setRestrictedTradeGroup] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('user_data');
    if (raw) {
      const u = JSON.parse(raw);
      const email = u.email.toLowerCase().trim();
      setUserEmail(email);
      if (isUserRestricted(email)) {
        const group = getDefaultTradeGroup(email);
        setUserIsRestricted(true);
        setRestrictedTradeGroup(group);
        setTradeFilter(group || 'all');
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = API_BASE_URL || '';
        const url = restrictedTradeGroup
          ? `${base}/api/cost/vehicle-financial-overview?trade_group=${encodeURIComponent(restrictedTradeGroup)}`
          : `${base}/api/cost/vehicle-financial-overview`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [restrictedTradeGroup]);

  const tradeGroups = useMemo(() => {
    if (!data || userIsRestricted) return [];
    return Array.from(new Set(data.vehicles.map(v => v.trade_group).filter(Boolean))).sort();
  }, [data, userIsRestricted]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.vehicles;
    if (tradeFilter !== 'all') list = list.filter(v => v.trade_group === tradeFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(v =>
        v.van_number.toLowerCase().includes(s) ||
        v.registration.toLowerCase().includes(s) ||
        v.vehicle_name.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'lease') return b.capital_cost - a.capital_cost;
      if (sortBy === 'service') return b.service_cost - a.service_cost;
      if (sortBy === 'maintenance') return b.maintenance_cost - a.maintenance_cost;
      return b.total_cost - a.total_cost;
    });
  }, [data, tradeFilter, search, sortBy]);

  // Fleet-level pie chart data
  const pieData = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      { name: 'Lease / Capital', value: s.total_fleet_capital_cost, color: C.blue },
      { name: 'Service', value: s.total_fleet_service_cost, color: C.teal },
      { name: 'Maintenance', value: s.total_fleet_maintenance_cost, color: C.orange },
    ].filter(d => d.value > 0);
  }, [data]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
      <div className="flex flex-col items-center gap-4">
        <Loader className="w-12 h-12 animate-spin" style={{ color: C.blue }} />
        <p style={{ color: C.body }}>Loading Total Cost of Ownership data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6" style={{ color: C.red }} />
          <h2 className="text-xl font-bold" style={{ color: C.title }}>Error</h2>
        </div>
        <p style={{ color: C.body }}>{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const s = data.summary;
  const pcts = s.fleet_cost_percentage;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.blue }}>
              <PoundSterling className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{ color: C.title }}>Total Cost of Ownership</h1>
              <p style={{ color: C.subtle, fontSize: 14 }}>Where did the money go? — Lease · Service · Maintenance per vehicle</p>
            </div>
          </div>
          {userIsRestricted && (
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', backgroundColor: '#e8f5e9', borderRadius: 6, fontSize: 12, color: C.green, fontWeight: 600 }}>
              🔒 Restricted view: {restrictedTradeGroup}
            </div>
          )}
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Fleet Spend', value: s.total_fleet_cost, color: C.blue, icon: PoundSterling, pct: null },
            { label: 'Lease / Capital Cost', value: s.total_fleet_capital_cost, color: C.blue, icon: Truck, pct: pcts.capital },
            { label: 'Service Cost', value: s.total_fleet_service_cost, color: C.teal, icon: TrendingUp, pct: pcts.service },
            { label: 'Maintenance Cost', value: s.total_fleet_maintenance_cost, color: C.orange, icon: Wrench, pct: pcts.maintenance },
          ].map(({ label, value, color, icon: Icon, pct: p }) => (
            <div key={label} className="bg-white rounded-lg p-5 shadow-sm border" style={{ borderColor: C.border }}>
              <div className="flex items-start justify-between">
                <div>
                  <p style={{ color: C.caption, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p className="text-2xl font-bold mt-2" style={{ color }}>{fmt(value)}</p>
                  {p !== null && <p style={{ color: C.subtle, fontSize: 12, marginTop: 4 }}>{p.toFixed(1)}% of total</p>}
                </div>
                <Icon className="w-7 h-7 opacity-20" style={{ color }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Fleet Pie + Legend ── */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border" style={{ borderColor: C.border }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: C.title }}>Where Did the Money Go?</h2>
          <p style={{ color: C.subtle, fontSize: 13, marginBottom: 16 }}>
            Fleet-wide breakdown across {s.total_vehicles_with_costs} vehicles · {data.insights.money_where}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Lease / Capital', value: s.total_fleet_capital_cost, share: pcts.capital, color: C.blue, desc: 'Total repayment from HSBC leases' },
                { label: 'Service Costs', value: s.total_fleet_service_cost, share: pcts.service, color: C.teal, desc: 'MOT, insurance, tax, fuel, repairs' },
                { label: 'Maintenance', value: s.total_fleet_maintenance_cost, share: pcts.maintenance, color: C.orange, desc: 'Planned & reactive maintenance' },
              ].map(({ label, value, share, color, desc }) => (
                <div key={label} style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
                      <span style={{ fontWeight: 700, color: C.title, fontSize: 14 }}>{label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color, fontSize: 15 }}>{fmt(value)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${share}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.subtle, minWidth: 36 }}>{share.toFixed(1)}%</span>
                  </div>
                  <p style={{ fontSize: 11, color: C.caption, marginTop: 4 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Legend Key ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.subtle }}>
            <Info size={14} />
            <span>Cost bar breakdown:</span>
          </div>
          {[['Lease / Capital', C.blue], ['Service', C.teal], ['Maintenance', C.orange]].map(([l, c]) => (
            <div key={l} className="flex items-center gap-2 text-sm" style={{ color: C.body }}>
              <div style={{ width: 16, height: 10, backgroundColor: c as string, borderRadius: 2 }} />
              <span>{l}</span>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search van #, registration, name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
              />
              <Search className="w-4 h-4" style={{ position: 'absolute', left: 10, top: 11, color: C.caption }} />
            </div>

            {/* Trade Group */}
            <select
              value={tradeFilter}
              onChange={e => !userIsRestricted && setTradeFilter(e.target.value)}
              disabled={userIsRestricted}
              style={{
                padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13,
                opacity: userIsRestricted ? 0.6 : 1, cursor: userIsRestricted ? 'not-allowed' : 'pointer',
                backgroundColor: userIsRestricted ? '#e8eaee' : C.white,
              }}
            >
              {!userIsRestricted && <option value="all">All Trade Groups</option>}
              {userIsRestricted
                ? <option value={restrictedTradeGroup || 'all'}>{restrictedTradeGroup}</option>
                : tradeGroups.map(t => <option key={t} value={t}>{t}</option>)
              }
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}
            >
              <option value="total">Sort: Total Cost (High → Low)</option>
              <option value="lease">Sort: Lease Cost (High → Low)</option>
              <option value="service">Sort: Service Cost (High → Low)</option>
              <option value="maintenance">Sort: Maintenance (High → Low)</option>
            </select>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: C.caption }}>
            Showing {filtered.length} of {data.vehicles.length} vehicles
          </p>
        </div>

        {/* ── Vehicle Table ── */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ borderColor: C.border }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.blue }}>
                {['Van #', 'Registration', 'Trade Group', 'Cost Bar', 'Lease / Capital', 'Service', 'Maintenance', 'Total Cost', ''].map((col, i) => (
                  <th key={i} style={{
                    padding: '11px 14px',
                    textAlign: i >= 4 ? 'right' : i === 3 ? 'center' : 'left',
                    color: C.white, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: C.caption }}>
                    No vehicles match your filters
                  </td>
                </tr>
              ) : filtered.map((v, idx) => (
                <React.Fragment key={v.van_number}>
                  <tr
                    style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: idx % 2 === 0 ? C.white : C.bg, cursor: 'pointer' }}
                    onClick={() => toggle(v.van_number)}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: C.title }}>Van {v.van_number}</td>
                    <td style={{ padding: '12px 14px', color: C.body, fontSize: 13 }}>{v.registration || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: C.blueSubtle, color: C.blue, fontSize: 11, fontWeight: 700 }}>
                        {v.trade_group}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', minWidth: 140 }}>
                      <CostBar lease={v.capital_cost} service={v.service_cost} maintenance={v.maintenance_cost} total={v.total_cost} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.blue, fontWeight: 600, fontSize: 13 }}>
                      {v.capital_cost > 0 ? fmt(v.capital_cost) : <span style={{ color: C.caption }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.teal, fontWeight: 600, fontSize: 13 }}>
                      {v.service_cost > 0 ? fmt(v.service_cost) : <span style={{ color: C.caption }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: C.orange, fontWeight: 600, fontSize: 13 }}>
                      {v.maintenance_cost > 0 ? fmt(v.maintenance_cost) : <span style={{ color: C.caption }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: C.title, fontSize: 14 }}>
                      {fmt(v.total_cost)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: C.caption }}>
                      {expanded.has(v.van_number) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>

                  {/* Expanded breakdown */}
                  {expanded.has(v.van_number) && (
                    <tr style={{ backgroundColor: C.blueSubtle, borderBottom: `1px solid ${C.border}` }}>
                      <td colSpan={9} style={{ padding: 16 }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Cost pillars */}
                          <div>
                            <p style={{ fontWeight: 700, color: C.title, marginBottom: 12, fontSize: 14 }}>Cost Breakdown</p>
                            <div className="space-y-3">
                              {[
                                { label: 'Lease / Capital Cost', value: v.capital_cost, pct: v.cost_percentage.capital, color: C.blue, sub: `HSBC Identifier: ${v.identifier}` },
                                { label: 'Service Cost', value: v.service_cost, pct: v.cost_percentage.service, color: C.teal, sub: 'MOT, insurance, fuel, tax, repairs' },
                                { label: 'Maintenance Cost', value: v.maintenance_cost, pct: v.cost_percentage.maintenance, color: C.orange, sub: 'Planned & reactive maintenance' },
                              ].map(({ label, value, pct: p, color, sub }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 3, height: 40, backgroundColor: color, borderRadius: 2, flexShrink: 0 }} />
                                  <div style={{ flex: 1 }}>
                                    <div className="flex justify-between">
                                      <span style={{ fontSize: 13, fontWeight: 600, color: C.body }}>{label}</span>
                                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value > 0 ? fmt(value) : '—'}</span>
                                    </div>
                                    <div style={{ marginTop: 4, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ width: `${p}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: C.caption }}>{sub} · {pct(p)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Service sub-type breakdown */}
                          {Object.keys(v.cost_breakdown).length > 0 && (
                            <div>
                              <p style={{ fontWeight: 700, color: C.title, marginBottom: 12, fontSize: 14 }}>Service Sub-types</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(v.cost_breakdown).map(([type, amount]) => (
                                  <div key={type} style={{ padding: '10px 12px', backgroundColor: C.white, borderRadius: 6, border: `1px solid ${C.border}` }}>
                                    <p style={{ fontSize: 11, color: C.caption, marginBottom: 2 }}>{type}</p>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{fmt(amount)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Grand total bar */}
                        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: C.white, borderRadius: 8, border: `1px solid ${C.border}` }}>
                          <div className="flex justify-between items-center mb-2">
                            <span style={{ fontWeight: 700, color: C.title }}>Total Cost of Ownership</span>
                            <span style={{ fontWeight: 700, color: C.blue, fontSize: 18 }}>{fmt(v.total_cost)}</span>
                          </div>
                          <CostBar lease={v.capital_cost} service={v.service_cost} maintenance={v.maintenance_cost} total={v.total_cost} />
                          <div className="flex gap-6 mt-2">
                            {[
                              { l: 'Lease', pct: v.cost_percentage.capital, c: C.blue },
                              { l: 'Service', pct: v.cost_percentage.service, c: C.teal },
                              { l: 'Maintenance', pct: v.cost_percentage.maintenance, c: C.orange },
                            ].map(({ l, pct: p, c }) => (
                              <span key={l} style={{ fontSize: 11, color: c, fontWeight: 600 }}>{l}: {p.toFixed(1)}%</span>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, color: C.caption, fontSize: 12 }}>
          <p>{s.total_vehicles_with_costs} vehicles · Lease data from HSBC · Operational costs from Salesforce</p>
        </div>
      </div>
    </div>
  );
}
