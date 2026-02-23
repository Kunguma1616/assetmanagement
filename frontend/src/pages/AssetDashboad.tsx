import { useEffect, useState, useMemo } from 'react';
import {
  Package, DollarSign, Loader2, RefreshCw,
  CheckCircle2, AlertCircle, TrendingUp, Search,
  Layers, ArrowRightLeft, Users, Clock, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
const COLORS = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1'];

interface AssetType    { type_name: string; count: number }
interface CostByType   { type_name: string; total_spend: number }
interface CostPerAsset { name: string; price: number }
interface Allocation   { asset_name: string|null; old_value: string|null; new_value: string|null; created_date: string|null }
interface AssetRecord  {
  id: string; name: string; status: string; is_available: boolean;
  serial_number: string|null; asset_type: string|null;
  install_date: string|null; purchase_date: string|null;
  created_date: string|null; price?: number;
}
interface SummaryResponse {
  total_assets: number; available_assets: number; distinct_types: number;
  asset_types: AssetType[]; total_cost: number; avg_cost_per_asset: number;
  cost_by_type: CostByType[]; cost_per_asset: CostPerAsset[]; allocations: Allocation[];
  price_field_used?: string;
}
interface LookupResponse { total: number; returned: number; assets: AssetRecord[] }
interface AllocApiResponse { success: boolean; total: number; returned: number; allocations: Allocation[] }

const fmt     = (v: unknown) => { const n = Number(v); return isNaN(n) ? '0' : n.toLocaleString('en-GB'); };
const fmtGBP  = (v: unknown) => {
  const n = Number(v);
  if (isNaN(n) || n === 0) return '£0.00';
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDate = (s: string|null) => { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; } };

// ── Tooltips ──────────────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const isCost = payload[0]?.name?.includes('£') || payload[0]?.name?.toLowerCase().includes('spend');
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xl text-sm">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      <p style={{ color: payload[0]?.fill ?? '#2563eb' }} className="font-semibold">
        {payload[0]?.name}: {isCost ? fmtGBP(val) : fmt(val)}
      </p>
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xl text-sm">
      <p className="font-bold text-slate-800 mb-1">{e.name}</p>
      <p className="text-slate-600">Count: <b>{fmt(e.value)}</b></p>
      <p className="text-slate-600">Share: <b>{((e.percent ?? 0) * 100).toFixed(1)}%</b></p>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, warning }: {
  label: string; value: string; sub?: string; icon: any; color: string; warning?: string;
}) {
  return (
    <Card className={`rounded-2xl p-6 text-white border-none shadow-lg ${color} relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="flex items-start justify-between mb-4 relative">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-tight max-w-[80%]">{label}</span>
        <div className="flex items-center gap-1">
          {warning && (
            <div title={warning}>
              <Info className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
            </div>
          )}
          <Icon className="h-4 w-4 opacity-60 flex-shrink-0 mt-0.5" />
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight relative">{value}</div>
      {sub && <p className="text-[11px] mt-2 opacity-75 font-medium leading-tight">{sub}</p>}
    </Card>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, available }: { status: string; available?: boolean }) {
  if (available === true)  return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Available</span>;
  if (available === false) return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Unavailable</span>;
  const map: Record<string, string> = {
    'Installed':'bg-green-100 text-green-700',
    'Purchased':'bg-blue-100 text-blue-700',
    'Shipped':'bg-amber-100 text-amber-700',
    'Working':'bg-emerald-100 text-emerald-700',
    'Unknown':'bg-slate-100 text-slate-400',
    'Active':'bg-emerald-100 text-emerald-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 border border-dashed border-slate-200 rounded-xl text-slate-400 gap-2">
      <AlertCircle className="h-7 w-7 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
  );
}

// ── Debug Banner — shows when cost data is £0 ─────────────────────────────────
function DebugBanner({ summary }: { summary: SummaryResponse }) {
  if (summary.total_cost > 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-amber-800">Cost data showing £0.00</p>
        <p className="text-xs text-amber-600 mt-1">
          Your Salesforce assets may use a different price field name.
          Run <code className="bg-amber-100 px-1 rounded font-mono">/api/dashboard/debug-discover</code> to check available fields,
          or verify that the <code className="bg-amber-100 px-1 rounded font-mono">Price</code> field is populated in Salesforce.
          {summary.price_field_used && (
            <> Currently using field: <b>{summary.price_field_used}</b>.</>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Cost Panel ────────────────────────────────────────────────────────────────
function CostPanel({ summary }: { summary: SummaryResponse }) {
  const [view, setView] = useState<'total'|'per-asset'|'by-type'>('total');
  const costTypeData = (summary.cost_by_type ?? []).filter(c => c.total_spend > 0).slice(0, 8).map(c => ({ name: c.type_name, value: c.total_spend }));
  const hasCostData = summary.total_cost > 0;

  return (
    <Card className="bg-white rounded-2xl shadow p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Asset Cost Analysis</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {summary.price_field_used
              ? `Using field: ${summary.price_field_used} from Salesforce`
              : 'SUM(Price) from Salesforce — WHERE Price != NULL'}
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-bold">
          {(['total','per-asset','by-type'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 transition ${view===v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {v==='total' ? 'Total' : v==='per-asset' ? 'Per Asset' : 'By Type'}
            </button>
          ))}
        </div>
      </div>

      {view === 'total' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Total Portfolio Spend</p>
              <p className={`text-4xl font-black ${hasCostData ? 'text-indigo-700' : 'text-slate-400'}`}>
                {fmtGBP(summary.total_cost)}
              </p>
              <p className="text-xs text-indigo-400 mt-1">
                {hasCostData ? `SUM(${summary.price_field_used ?? 'Price'}) WHERE != NULL` : 'No price data found in Salesforce'}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Average Per Asset</p>
              <p className={`text-4xl font-black ${hasCostData ? 'text-amber-700' : 'text-slate-400'}`}>
                {fmtGBP(summary.avg_cost_per_asset)}
              </p>
              <p className="text-xs text-amber-400 mt-1">Total ÷ {fmt(summary.total_assets)} assets</p>
            </div>
          </div>
          {costTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize:'11px', fontWeight:600 }} width={120} tickFormatter={v => v.length > 16 ? `${v.slice(0,16)}…` : v} />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize:'11px' }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="value" name="£ Spend" radius={[0,6,6,0]}>
                  {costTypeData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No cost by type data" hint="Ensure the Price field is populated in Salesforce" />
          )}
        </div>
      )}

      {view === 'per-asset' && (
        <div className="overflow-auto max-h-80 rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Asset Name</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(summary.cost_per_asset ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No price data in Salesforce — check that the Price field is populated
                  </td>
                </tr>
              ) : (summary.cost_per_asset ?? []).map((a, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{i+1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{a.name}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{fmtGBP(a.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'by-type' && (
        costTypeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize:'11px', fontWeight:600 }} width={140} tickFormatter={v => v.length > 18 ? `${v.slice(0,18)}…` : v} />
              <XAxis type="number" stroke="#94a3b8" style={{ fontSize:'11px' }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="value" name="£ Spend" radius={[0,6,6,0]}>
                {costTypeData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No cost by type data" hint="The Price field may not be populated in Salesforce" />
        )
      )}
    </Card>
  );
}

// ── Allocation Panel ──────────────────────────────────────────────────────────
function AllocationPanel({ allocations, total }: { allocations: Allocation[]; total: number }) {
  const isRawId = (s: string) => /^[a-zA-Z0-9]{15,18}$/.test((s||'').trim());

  const topAssets = useMemo(() => {
    const map: Record<string, number> = {};
    allocations.forEach(a => { if (a.asset_name) map[a.asset_name] = (map[a.asset_name]||0) + 1; });
    return Object.entries(map).sort((x,y) => y[1]-x[1]).slice(0,8).map(([name,value]) => ({ name, value }));
  }, [allocations]);

  const topRecipients = useMemo(() => {
    const map: Record<string, number> = {};
    allocations.forEach(a => {
      const v = a.new_value;
      if (v && !isRawId(v)) map[v] = (map[v]||0) + 1;
    });
    return Object.entries(map).sort((x,y) => y[1]-x[1]).slice(0,6).map(([name,value]) => ({ name, value }));
  }, [allocations]);

  const recentCount = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
    return allocations.filter(a => a.created_date && new Date(a.created_date) >= cutoff).length;
  }, [allocations]);

  const uniqueAssets = useMemo(() => new Set(allocations.map(a => a.asset_name).filter(Boolean)).size, [allocations]);
  const pieData = topRecipients.slice(0,5);

  return (
    <Card className="bg-white rounded-2xl shadow p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Asset Allocation Overview</h2>
            <p className="text-xs text-slate-400 mt-0.5">AssetHistory · Field = User__c · Is_Available__c = TRUE</p>
          </div>
        </div>
        <button onClick={() => window.location.href='/asset-history'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition">
          View Full Log →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Movements', value: fmt(total),        icon: ArrowRightLeft, color: 'bg-indigo-600' },
          { label: 'Last 30 Days',    value: fmt(recentCount),  icon: Clock,          color: 'bg-emerald-600' },
          { label: 'Assets Moved',    value: fmt(uniqueAssets), icon: Package,        color: 'bg-violet-600' },
          { label: 'Avg / Asset',     value: uniqueAssets > 0 ? (total/uniqueAssets).toFixed(1) : '0', icon: TrendingUp, color: 'bg-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${color} text-white rounded-xl p-4 relative overflow-hidden`}>
            <div className="absolute -right-2 -top-2 w-12 h-12 rounded-full bg-white/10" />
            <Icon className="h-4 w-4 opacity-60 mb-2" />
            <p className="text-2xl font-black">{value}</p>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 mb-1">Most Re-assigned Assets</h3>
          <p className="text-xs text-slate-400 mb-3">Top assets by number of user changes</p>
          {topAssets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topAssets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" horizontal={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8"
                  style={{ fontSize:'10px', fontWeight:600 }} width={130}
                  tickFormatter={v => v.length > 17 ? v.slice(0,17)+'…' : v} />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize:'10px' }} allowDecimals={false} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl text-xs">
                    <p className="font-bold text-slate-800 mb-0.5">{label}</p>
                    <p className="text-indigo-600 font-semibold">Re-assignments: {payload[0]?.value}</p>
                  </div>
                ) : null} />
                <Bar dataKey="value" name="Moves" radius={[0,4,4,0]}>
                  {topAssets.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No asset movement data" hint="AssetHistory records will appear here" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-900 mb-1">Top Asset Recipients</h3>
          <p className="text-xs text-slate-400 mb-3">Who received the most asset assignments</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xl text-xs">
                    <p className="font-bold text-slate-800 mb-0.5">{payload[0]?.name}</p>
                    <p className="font-semibold" style={{ color: payload[0]?.payload?.fill }}>Received: {payload[0]?.value}</p>
                  </div>
                ) : null} />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle"
                  wrapperStyle={{ fontSize:11, fontWeight:600, paddingLeft:8 }}
                  formatter={v => v.length > 16 ? v.slice(0,16)+'…' : v} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 border border-dashed border-slate-200 rounded-xl text-slate-400">
              <div className="text-center p-4">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Recipients show as IDs</p>
                <p className="text-[11px] mt-1">View Full Log for details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-900 mb-3">Recent Movements</h3>
        <div className="space-y-2">
          {allocations.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{a.asset_name ?? '—'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">
                    {a.old_value ? (
                      /^[a-zA-Z0-9]{15,18}$/.test(a.old_value) ? `ID:${a.old_value.slice(0,6)}…` : a.old_value
                    ) : 'Unassigned'}
                  </span>
                  <span className="text-slate-300 flex-shrink-0">→</span>
                  <span className={`text-xs font-semibold truncate max-w-[120px] ${a.new_value && !/^[a-zA-Z0-9]{15,18}$/.test(a.new_value) ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {a.new_value ? (
                      /^[a-zA-Z0-9]{15,18}$/.test(a.new_value) ? `ID:${a.new_value.slice(0,6)}…` : a.new_value
                    ) : 'Unassigned'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">{fmtDate(a.created_date)}</p>
              </div>
            </div>
          ))}
        </div>
        {allocations.length === 0 && (
          <EmptyState
            message="No allocation history"
            hint="No User__c changes found on available assets in AssetHistory"
          />
        )}
      </div>
    </Card>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary,   setSummary]   = useState<SummaryResponse | null>(null);
  const [lookup,    setLookup]    = useState<LookupResponse | null>(null);
  const [allocData, setAllocData] = useState<AllocApiResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [activeTab, setActiveTab] = useState<'types'|'cost'>('types');

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const [sumRes, lookRes, allocRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/summary`),
        fetch(`${API_BASE}/api/dashboard/asset-lookup?limit=500`),
        fetch(`${API_BASE}/api/allocation/?limit=2000`),
      ]);

      if (!sumRes.ok) {
        const txt = await sumRes.text();
        throw new Error(`Summary API ${sumRes.status}: ${txt}`);
      }

      const sumData: SummaryResponse = await sumRes.json();
      setSummary(sumData);

      if (lookRes.ok)  { const d: LookupResponse   = await lookRes.json();  setLookup(d); }
      if (allocRes.ok) { const d: AllocApiResponse = await allocRes.json(); setAllocData(d); }

      // Warn if data looks suspicious
      if (sumData.total_assets > 0 && sumData.available_assets === 0) {
        toast.warning('Available Assets shows 0 — Is_Available__c may not be set in Salesforce');
      }
      if (sumData.total_assets > 0 && sumData.total_cost === 0) {
        toast.warning('Cost data is £0.00 — Price field may be empty or named differently in Salesforce');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <p className="text-xl font-bold text-slate-700">Loading Salesforce data…</p>
    </div>
  );

  if (error || !summary) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <AlertCircle className="w-16 h-16 text-red-500" />
      <p className="text-xl font-bold text-red-600">Failed to load dashboard</p>
      <p className="text-sm text-slate-500 max-w-sm text-center">{error}</p>
      <Button onClick={load} className="mt-2"><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
    </div>
  );

  // Filter out "Unassigned" from type charts — keep real types only
  const typeChartData = (summary.asset_types ?? [])
    .filter(t => t.count > 0 && t.type_name !== 'Unassigned')
    .slice(0, 8)
    .map(t => ({ name: t.type_name, value: t.count }));

  const costChartData = (summary.cost_by_type ?? [])
    .filter(c => c.total_spend > 0)
    .slice(0, 8)
    .map(c => ({ name: c.type_name, value: c.total_spend }));

  const activeChartData = activeTab === 'types' ? typeChartData : costChartData;

  const filteredAssets = (lookup?.assets ?? []).filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.name ?? '').toLowerCase().includes(q) ||
      (a.serial_number ?? '').toLowerCase().includes(q) ||
      (a.status ?? '').toLowerCase().includes(q) ||
      (a.asset_type ?? '').toLowerCase().includes(q)
    );
  });

  const allocs = allocData?.allocations ?? summary.allocations ?? [];

  return (
    <div className="min-h-screen bg-[#f1f5f9]">

      {/* Page title bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Asset Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Enterprise Asset Intelligence</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* Debug Banner — only shows when cost is £0 */}
        <DebugBanner summary={summary} />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Total Assets"
            value={fmt(summary.total_assets)}
            sub="All records in Salesforce"
            icon={Package}
            color="bg-blue-600"
          />
          <KpiCard
            label="Available Assets"
            value={fmt(summary.available_assets)}
            sub="Is_Available__c = TRUE"
            icon={CheckCircle2}
            color="bg-emerald-600"
            warning={summary.available_assets === 0 && summary.total_assets > 0
              ? 'Showing 0 — Is_Available__c may not be set. Check /api/dashboard/debug-discover'
              : undefined}
          />
          <KpiCard
            label="Asset Types"
            value={fmt(summary.distinct_types)}
            sub="Distinct categories"
            icon={Layers}
            color="bg-violet-600"
          />
          <KpiCard
            label="Total Cost – Aspect"
            value={fmtGBP(summary.total_cost)}
            sub={summary.price_field_used ? `Field: ${summary.price_field_used}` : 'SUM(Price) from Salesforce'}
            icon={DollarSign}
            color="bg-indigo-600"
            warning={summary.total_cost === 0 && summary.total_assets > 0
              ? 'Showing £0 — Price field may be empty. Check /api/dashboard/debug-discover'
              : undefined}
          />
          <KpiCard
            label="Cost Per Asset"
            value={fmtGBP(summary.avg_cost_per_asset)}
            sub="Portfolio average"
            icon={TrendingUp}
            color="bg-amber-600"
          />
        </div>

        {/* ASSET TYPE CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white rounded-2xl shadow p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {activeTab === 'types' ? 'Assets by Type' : 'Cost by Asset Type'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeTab === 'types' ? 'Count per type' : 'SUM(Price) per type — £'}
                </p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-bold">
                <button onClick={() => setActiveTab('types')} className={`px-3 py-1.5 transition ${activeTab==='types' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Count</button>
                <button onClick={() => setActiveTab('cost')}  className={`px-3 py-1.5 transition ${activeTab==='cost'  ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Cost £</button>
              </div>
            </div>
            {activeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={activeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize:'11px', fontWeight:600 }} width={120} tickFormatter={v => v.length > 16 ? `${v.slice(0,16)}…` : v} />
                  <XAxis type="number" stroke="#94a3b8" style={{ fontSize:'11px' }}
                    tickFormatter={v => activeTab === 'cost' ? `£${(v/1000).toFixed(0)}k` : fmt(v)} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="value" name={activeTab === 'cost' ? '£ Spend' : 'Assets'} radius={[0,6,6,0]}>
                    {activeChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message={activeTab === 'types' ? 'No type data available' : 'No cost data available'}
                hint={activeTab === 'cost' ? 'Ensure Price field is populated in Salesforce' : 'Assets may not have Asset_Type__c set'}
              />
            )}
          </Card>

          <Card className="bg-white rounded-2xl shadow p-6 border border-slate-100">
            <h2 className="text-base font-black text-slate-900 mb-1">Type Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Proportion of assets per type</p>
            {typeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={typeChartData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                    {typeChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize:11, fontWeight:600, paddingTop:12 }} formatter={v => v.length > 20 ? `${v.slice(0,20)}…` : v} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message="No type distribution data"
                hint="Asset_Type__c field may not be populated or mapped"
              />
            )}
          </Card>
        </div>

        {/* COST PANEL */}
        <CostPanel summary={summary} />

        {/* ASSET ALLOCATION */}
        <AllocationPanel allocations={allocs} total={allocData?.total ?? summary.allocations?.length ?? 0} />

        {/* ASSET LOOKUP TABLE */}
        <Card className="bg-white rounded-2xl shadow p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Search className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Asset Lookup <span className="text-blue-600">({fmt(lookup?.total ?? 0)})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {fmt(filteredAssets.length)} of {fmt(lookup?.returned ?? 0)} fetched
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, serial, type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-auto max-h-[520px] rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  {['#','Name','Status','Available','Asset Type','Serial No.','Install Date','Created','Price'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                      {search ? 'No assets match your search.' : 'No assets loaded.'}
                    </td>
                  </tr>
                ) : filteredAssets.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{i+1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap max-w-[180px] truncate">{a.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status="" available={a.is_available} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">{a.asset_type ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{a.serial_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(a.install_date)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(a.created_date)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-indigo-700 whitespace-nowrap">
                      {a.price && a.price > 0 ? fmtGBP(a.price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}