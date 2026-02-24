import { useEffect, useState, useMemo } from 'react';
import {
  Package, DollarSign, Loader2, RefreshCw,
  CheckCircle2, AlertCircle, TrendingUp, Search,
  Layers, ArrowRightLeft, Users, Clock, Info,
  PoundSterlingIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';

// ── Brand palette (exact colors.ts values) ────────────────────────────────────
const C = {
  blue:         "#27549D",
  blueLight:    "#7099DB",
  blueDark:     "#17325E",
  blueSubtle:   "#F7F9FD",
  blueBorder:   "#DEE8F7",
  yellow:       "#F1FF24",
  green:        "#2EB844",
  greenSubtle:  "#ECFDF5",
  orange:       "#F29630",
  orangeSubtle: "#FEF5EC",
  red:          "#D15134",
  redSubtle:    "#FAEDEA",
  gray:         "#848EA3",
  graySubtle:   "#646F86",
  body:         "#323843",
  title:        "#1A1D23",
  border:       "#CDD1DA",
  borderSubtle: "#F3F4F6",
  bg:           "#F3F4F6",
  white:        "#FFFFFF",
};

// Use brand colours for charts instead of the original generic palette
const COLORS = [
  C.blue, C.blueLight, C.green, C.orange, C.red,
  C.blueDark, C.gray, C.graySubtle,
  "#2EB844", "#F1FF24",
];

const FONT = "'Mont', sans-serif";

// ── Mont @font-face injection — call once at module level ─────────────────────
const MONT_CSS = `
  @font-face { font-family:'Mont'; src:url('/fonts/MontHeavy/MontHeavy.otf') format('opentype');                   font-weight:900; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontHeavyItalic/MontHeavyItalic.otf') format('opentype');       font-weight:900; font-style:italic; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontBlack/MontBlack.otf') format('opentype');                   font-weight:950; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontBold/MontBold.otf') format('opentype');                     font-weight:700; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontBoldItalic/MontBoldItalic.otf') format('opentype');         font-weight:700; font-style:italic; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontSemiBold/MontSemiBold.otf') format('opentype');             font-weight:600; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontSemiBoldItalic/MontSemiBoldItalic.otf') format('opentype'); font-weight:600; font-style:italic; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontRegular/MontRegular.otf') format('opentype');               font-weight:400; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontRegularItalic/MontRegularItalic.otf') format('opentype');   font-weight:400; font-style:italic; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontBook/MontBook.otf') format('opentype');                     font-weight:350; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontLight/MontLight.otf') format('opentype');                   font-weight:300; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontLightItalic/MontLightItalic.otf') format('opentype');       font-weight:300; font-style:italic; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontThin/MontThin.otf') format('opentype');                     font-weight:100; font-style:normal; }
  @font-face { font-family:'Mont'; src:url('/fonts/MontThinItalic/MontThinItalic.otf') format('opentype');         font-weight:100; font-style:italic; }

  /* Force Mont everywhere — overrides Tailwind's font-sans */
  *, body, html { font-family: 'Mont', sans-serif !important; }

  ::-webkit-scrollbar       { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${C.borderSubtle}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

// Inject once
if (typeof document !== 'undefined' && !document.getElementById('mont-font-styles')) {
  const style = document.createElement('style');
  style.id = 'mont-font-styles';
  style.textContent = MONT_CSS;
  document.head.appendChild(style);
}

// ── Types ─────────────────────────────────────────────────────────────────────
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
interface LookupResponse   { total: number; returned: number; assets: AssetRecord[] }
interface AllocApiResponse { success: boolean; total: number; returned: number; allocations: Allocation[] }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (v: unknown) => { const n = Number(v); return isNaN(n) ? '0' : n.toLocaleString('en-GB'); };
const fmtGBP  = (v: unknown) => {
  const n = Number(v);
  if (isNaN(n) || n === 0) return '£0.00';
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDate = (s: string|null) => { if (!s) return '—'; try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; } };

// ── Aspect Logo ───────────────────────────────────────────────────────────────
function AspectLogo({ size = 52 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
        <path d="M8 10 C8 4 12 0 18 0 H68 L100 50 L68 100 H18 C12 100 8 96 8 90 Z" fill={C.blue} />
        <rect x="16" y="14" width="18" height="14" rx="2" fill={C.yellow} />
        <rect x="16" y="34" width="18" height="14" rx="2" fill={C.yellow} />
        <rect x="16" y="54" width="18" height="14" rx="2" fill={C.yellow} />
        <rect x="16" y="74" width="18" height="14" rx="2" fill={C.yellow} />
        <rect x="40" y="14" width="12" height="14" rx="2" fill={C.yellow} />
        <rect x="40" y="34" width="12" height="14" rx="2" fill={C.yellow} />
        <rect x="40" y="54" width="30" height="14" rx="2" fill={C.yellow} />
        <rect x="40" y="74" width="30" height="14" rx="2" fill={C.yellow} />
        <rect x="58" y="14" width="24" height="28" rx="2" fill={C.yellow} />
      </svg>
    );
  }
  return (
    <img
      src="/aspect-logo-icon.svg"
      alt="Aspect"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, display: 'block', objectFit: 'contain' }}
    />
  );
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val  = payload[0]?.value;
  const isCost = payload[0]?.name?.includes('£') || payload[0]?.name?.toLowerCase().includes('spend');
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(39,84,157,0.10)', fontFamily: FONT }}>
      <p style={{ fontWeight: 700, color: C.title, marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: payload[0]?.fill ?? C.blue, fontWeight: 800, fontSize: 13, margin: 0 }}>
        {payload[0]?.name}: {isCost ? fmtGBP(val) : fmt(val)}
      </p>
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(39,84,157,0.10)', fontFamily: FONT }}>
      <p style={{ fontWeight: 700, color: C.title, marginBottom: 4, fontSize: 12 }}>{e.name}</p>
      <p style={{ color: C.gray, fontSize: 12, margin: '2px 0' }}>Count: <b style={{ color: C.body }}>{fmt(e.value)}</b></p>
      <p style={{ color: C.gray, fontSize: 12, margin: 0 }}>Share: <b style={{ color: C.body }}>{((e.percent ?? 0) * 100).toFixed(1)}%</b></p>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, warning }: {
  label: string; value: string; sub?: string; icon: any; accent: string; warning?: string;
}) {
  return (
    <div style={{
      background: accent, borderRadius: 16, padding: '22px 20px',
      color: C.white, border: 'none', boxShadow: '0 4px 18px rgba(0,0,0,0.13)',
      position: 'relative', overflow: 'hidden', fontFamily: FONT,
    }}>
      <div style={{ position: 'absolute', right: -14, top: -14, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, lineHeight: 1.3, maxWidth: '80%' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {warning && <div title={warning}><Info style={{ width: 13, height: 13, opacity: 0.65, flexShrink: 0 }} /></div>}
          <Icon style={{ width: 16, height: 16, opacity: 0.65, flexShrink: 0 }} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', fontFamily: FONT, position: 'relative' }}>{value}</div>
      {sub && <p style={{ fontSize: 10, marginTop: 6, opacity: 0.75, fontWeight: 600, lineHeight: 1.4, margin: '6px 0 0', fontFamily: FONT }}>{sub}</p>}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, available }: { status: string; available?: boolean }) {
  const base: React.CSSProperties = { padding: '2px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: FONT };
  if (available === true)  return <span style={{ ...base, background: C.greenSubtle,  color: C.green }}>Available</span>;
  if (available === false) return <span style={{ ...base, background: C.borderSubtle, color: C.gray  }}>Unavailable</span>;
  const map: Record<string, React.CSSProperties> = {
    'Installed': { background: C.greenSubtle,  color: C.green   },
    'Purchased': { background: C.blueSubtle,   color: C.blue    },
    'Shipped':   { background: C.orangeSubtle, color: C.orange  },
    'Working':   { background: C.greenSubtle,  color: C.green   },
    'Unknown':   { background: C.borderSubtle, color: C.gray    },
    'Active':    { background: C.greenSubtle,  color: C.green   },
  };
  return <span style={{ ...base, ...(map[status] ?? { background: C.borderSubtle, color: C.graySubtle }) }}>{status}</span>;
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.gray, gap: 8, fontFamily: FONT }}>
      <AlertCircle style={{ width: 28, height: 28, opacity: 0.4 }} />
      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{message}</p>
      {hint && <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>{hint}</p>}
    </div>
  );
}

// ── Debug Banner ──────────────────────────────────────────────────────────────
function DebugBanner({ summary }: { summary: SummaryResponse }) {
  if (summary.total_cost > 0) return null;
  return (
    <div style={{ background: C.orangeSubtle, border: `1px solid #F7C182`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, fontFamily: FONT }}>
      <AlertCircle style={{ width: 18, height: 18, color: C.orange, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#A35C0A', margin: '0 0 4px' }}>Cost data showing £0.00</p>
        <p style={{ fontSize: 11, color: '#A35C0A', margin: 0, lineHeight: 1.5 }}>
          Your Salesforce assets may use a different price field name.
          Run <code style={{ background: '#FCE9D4', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>/api/dashboard/debug-discover</code> to check available fields,
          or verify that the <code style={{ background: '#FCE9D4', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>Price</code> field is populated in Salesforce.
          {summary.price_field_used && <> Currently using field: <b>{summary.price_field_used}</b>.</>}
        </p>
      </div>
    </div>
  );
}

// ── Cost Panel ────────────────────────────────────────────────────────────────
function CostPanel({ summary }: { summary: SummaryResponse }) {
  const [view, setView] = useState<'total'|'per-asset'|'by-type'>('total');
  const costTypeData = (summary.cost_by_type ?? []).filter(c => c.total_spend > 0).slice(0, 8).map(c => ({ name: c.type_name, value: c.total_spend }));
  const hasCostData  = summary.total_cost > 0;

  return (
    <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(39,84,157,0.07)', padding: 24, border: `1px solid ${C.borderSubtle}`, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: C.title, margin: '0 0 3px', fontFamily: FONT }}>Asset Cost Analysis</h2>
          <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>
            {summary.price_field_used ? `Using field: ${summary.price_field_used} from Salesforce` : 'SUM(Price) from Salesforce — WHERE Price != NULL'}
          </p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>
          {(['total','per-asset','by-type'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 12, transition: 'all 0.15s',
              background: view === v ? C.blue : C.white,
              color: view === v ? C.white : C.gray,
            }}>
              {v === 'total' ? 'Total' : v === 'per-asset' ? 'Per Asset' : 'By Type'}
            </button>
          ))}
        </div>
      </div>

      {view === 'total' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: C.blueSubtle, borderRadius: 12, padding: 20, border: `1px solid ${C.blueBorder}` }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT }}>Total Portfolio Spend</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: hasCostData ? C.blueDark : C.gray, margin: '0 0 4px', fontFamily: FONT }}>
                {fmtGBP(summary.total_cost)}
              </p>
              <p style={{ fontSize: 10, color: C.blueLight, margin: 0, fontFamily: FONT }}>
                {hasCostData ? `SUM(${summary.price_field_used ?? 'Price'}) WHERE != NULL` : 'No price data found in Salesforce'}
              </p>
            </div>
            <div style={{ background: C.orangeSubtle, borderRadius: 12, padding: 20, border: `1px solid #FCE9D4` }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT }}>Average Per Asset</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: hasCostData ? '#A35C0A' : C.gray, margin: '0 0 4px', fontFamily: FONT }}>
                {fmtGBP(summary.avg_cost_per_asset)}
              </p>
              <p style={{ fontSize: 10, color: C.orange, margin: 0, fontFamily: FONT }}>Total ÷ {fmt(summary.total_assets)} assets</p>
            </div>
          </div>
          {costTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                <YAxis type="category" dataKey="name" stroke={C.gray} style={{ fontSize: '11px', fontWeight: 600, fontFamily: FONT }} width={120} tickFormatter={v => v.length > 16 ? `${v.slice(0,16)}…` : v} />
                <XAxis type="number" stroke={C.gray} style={{ fontSize: '11px', fontFamily: FONT }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="value" name="£ Spend" radius={[0,6,6,0]}>
                  {costTypeData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No cost by type data" hint="Ensure the Price field is populated in Salesforce" />
          )}
        </div>
      )}

      {view === 'per-asset' && (
        <div style={{ overflowX: 'auto', maxHeight: 320, borderRadius: 10, border: `1px solid ${C.borderSubtle}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
            <thead style={{ background: C.blueSubtle, position: 'sticky', top: 0 }}>
              <tr>
                {['#','Asset Name','Price'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Price' ? 'right' : 'left', fontSize: 10, fontWeight: 800, color: C.blueDark, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.blueBorder}`, fontFamily: FONT }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(summary.cost_per_asset ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '32px 16px', textAlign: 'center', color: C.gray, fontSize: 13, fontFamily: FONT }}>
                    No price data in Salesforce — check that the Price field is populated
                  </td>
                </tr>
              ) : (summary.cost_per_asset ?? []).map((a, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <td style={{ padding: '10px 16px', color: C.gray, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{i+1}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: C.title, fontFamily: FONT }}>{a.name}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: C.blue, fontFamily: FONT }}>{fmtGBP(a.price)}</td>
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
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
              <YAxis type="category" dataKey="name" stroke={C.gray} style={{ fontSize: '11px', fontWeight: 600, fontFamily: FONT }} width={140} tickFormatter={v => v.length > 18 ? `${v.slice(0,18)}…` : v} />
              <XAxis type="number" stroke={C.gray} style={{ fontSize: '11px', fontFamily: FONT }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="value" name="£ Spend" radius={[0,6,6,0]}>
                {costTypeData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No cost by type data" hint="The Price field may not be populated in Salesforce" />
        )
      )}
    </div>
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

  const miniCards = [
    { label: 'Total Movements', value: fmt(total),        icon: ArrowRightLeft, accent: C.blue   },
    { label: 'Last 30 Days',    value: fmt(recentCount),  icon: Clock,          accent: C.green  },
    { label: 'Assets Moved',    value: fmt(uniqueAssets), icon: Package,        accent: '#7c3aed' },
    { label: 'Avg / Asset',     value: uniqueAssets > 0 ? (total/uniqueAssets).toFixed(1) : '0', icon: TrendingUp, accent: C.orange },
  ];

  return (
    <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(39,84,157,0.07)', padding: 24, border: `1px solid ${C.borderSubtle}`, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRightLeft style={{ width: 18, height: 18, color: C.blue }} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: C.title, margin: '0 0 2px', fontFamily: FONT }}>Asset Allocation Overview</h2>
            <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>AssetHistory · Field = User__c · Is_Available__c = TRUE</p>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/asset-history'}
          style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, color: C.blue, background: C.blueSubtle, border: `1px solid ${C.blueBorder}`, borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}>
          View Full Log →
        </button>
      </div>

      {/* Mini stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {miniCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} style={{ background: accent, borderRadius: 12, padding: '14px 16px', color: C.white, position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
            <div style={{ position: 'absolute', right: -8, top: -8, width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <Icon style={{ width: 16, height: 16, opacity: 0.65, marginBottom: 8 }} />
            <p style={{ fontSize: 26, fontWeight: 900, margin: '0 0 2px', fontFamily: FONT }}>{value}</p>
            <p style={{ fontSize: 9, opacity: 0.75, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, fontFamily: FONT }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: C.title, margin: '0 0 2px', fontFamily: FONT }}>Most Re-assigned Assets</h3>
          <p style={{ fontSize: 11, color: C.gray, margin: '0 0 12px', fontFamily: FONT }}>Top assets by number of user changes</p>
          {topAssets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topAssets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                <YAxis type="category" dataKey="name" stroke={C.gray} style={{ fontSize: '10px', fontWeight: 600, fontFamily: FONT }} width={130} tickFormatter={v => v.length > 17 ? v.slice(0,17)+'…' : v} />
                <XAxis type="number" stroke={C.gray} style={{ fontSize: '10px', fontFamily: FONT }} allowDecimals={false} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(39,84,157,0.10)', fontFamily: FONT }}>
                    <p style={{ fontWeight: 700, color: C.title, fontSize: 12, margin: '0 0 3px' }}>{label}</p>
                    <p style={{ color: C.blue, fontWeight: 700, fontSize: 12, margin: 0 }}>Re-assignments: {payload[0]?.value}</p>
                  </div>
                ) : null} />
                <Bar dataKey="value" name="Moves" radius={[0,5,5,0]}>
                  {topAssets.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No asset movement data" hint="AssetHistory records will appear here" />
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: C.title, margin: '0 0 2px', fontFamily: FONT }}>Top Asset Recipients</h3>
          <p style={{ fontSize: 11, color: C.gray, margin: '0 0 12px', fontFamily: FONT }}>Who received the most asset assignments</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(39,84,157,0.10)', fontFamily: FONT }}>
                    <p style={{ fontWeight: 700, color: C.title, fontSize: 12, margin: '0 0 3px' }}>{payload[0]?.name}</p>
                    <p style={{ fontWeight: 700, fontSize: 12, margin: 0, color: (payload[0]?.payload as any)?.fill ?? C.blue }}>Received: {payload[0]?.value}</p>
                  </div>
                ) : null} />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle"
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingLeft: 8, fontFamily: FONT }}
                  formatter={v => v.length > 16 ? v.slice(0,16)+'…' : v} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.gray }}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Users style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 13, margin: '0 0 4px', fontFamily: FONT }}>Recipients show as IDs</p>
                <p style={{ fontSize: 11, margin: 0, fontFamily: FONT }}>View Full Log for details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: C.title, margin: '0 0 12px', fontFamily: FONT }}>Recent Movements</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allocations.slice(0,5).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: C.bg, transition: 'background 0.12s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.blueSubtle)}
              onMouseLeave={e => (e.currentTarget.style.background = C.bg)}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowRightLeft style={{ width: 15, height: 15, color: C.blue }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: C.title, margin: '0 0 2px', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset_name ?? '—'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.gray, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                    {a.old_value ? (/^[a-zA-Z0-9]{15,18}$/.test(a.old_value) ? `ID:${a.old_value.slice(0,6)}…` : a.old_value) : 'Unassigned'}
                  </span>
                  <span style={{ color: C.border, flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.new_value && !/^[a-zA-Z0-9]{15,18}$/.test(a.new_value) ? C.green : C.gray, fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                    {a.new_value ? (/^[a-zA-Z0-9]{15,18}$/.test(a.new_value) ? `ID:${a.new_value.slice(0,6)}…` : a.new_value) : 'Unassigned'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>{fmtDate(a.created_date)}</p>
              </div>
            </div>
          ))}
        </div>
        {allocations.length === 0 && (
          <EmptyState message="No allocation history" hint="No User__c changes found on available assets in AssetHistory" />
        )}
      </div>
    </div>
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
      if (!sumRes.ok) { const txt = await sumRes.text(); throw new Error(`Summary API ${sumRes.status}: ${txt}`); }
      const sumData: SummaryResponse = await sumRes.json();
      setSummary(sumData);
      if (lookRes.ok)  { const d: LookupResponse   = await lookRes.json();  setLookup(d); }
      if (allocRes.ok) { const d: AllocApiResponse = await allocRes.json(); setAllocData(d); }
      if (sumData.total_assets > 0 && sumData.available_assets === 0) toast.warning('Available Assets shows 0 — Is_Available__c may not be set in Salesforce');
      if (sumData.total_assets > 0 && sumData.total_cost === 0)        toast.warning('Cost data is £0.00 — Price field may be empty or named differently in Salesforce');
    } catch (e: any) {
      console.error(e); setError(e.message); toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg, gap: 16, fontFamily: FONT }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${C.blueBorder}`, borderTopColor: C.blue, animation: 'spin 0.75s linear infinite' }} />
      <p style={{ fontSize: 16, fontWeight: 700, color: C.gray, fontFamily: FONT }}>Loading Salesforce data…</p>
    </div>
  );

  if (error || !summary) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: C.bg, gap: 16, fontFamily: FONT }}>
      <AlertCircle style={{ width: 64, height: 64, color: C.red }} />
      <p style={{ fontSize: 18, fontWeight: 800, color: C.red, fontFamily: FONT }}>Failed to load dashboard</p>
      <p style={{ fontSize: 13, color: C.gray, maxWidth: 360, textAlign: 'center', fontFamily: FONT }}>{error}</p>
      <Button onClick={load} style={{ background: C.blue, color: C.white, border: 'none', padding: '10px 24px', borderRadius: 10, fontFamily: FONT, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw style={{ width: 16, height: 16 }} /> Retry
      </Button>
    </div>
  );

  const typeChartData = (summary.asset_types ?? []).filter(t => t.count > 0 && t.type_name !== 'Unassigned').slice(0,8).map(t => ({ name: t.type_name, value: t.count }));
  const costChartData = (summary.cost_by_type ?? []).filter(c => c.total_spend > 0).slice(0,8).map(c => ({ name: c.type_name, value: c.total_spend }));
  const activeChartData = activeTab === 'types' ? typeChartData : costChartData;

  const filteredAssets = (lookup?.assets ?? []).filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.name ?? '').toLowerCase().includes(q) || (a.serial_number ?? '').toLowerCase().includes(q) || (a.status ?? '').toLowerCase().includes(q) || (a.asset_type ?? '').toLowerCase().includes(q);
  });

  const allocs = allocData?.allocations ?? summary.allocations ?? [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>

      {/* ── STICKY TOP BAR with profile_header.jpg background ───────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/profile_header.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
        {/* Brand overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.blueDark}F2 0%, ${C.blue}E0 60%, ${C.blueLight}C0 100%)`, zIndex: 1 }} />
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: -40, right: 180, width: 100, height: 100, borderRadius: '50%', background: 'rgba(241,255,36,0.08)', zIndex: 1 }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo box */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'visible',
            }}>
              <AspectLogo size={40} />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '0 0 1px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT }}>
                Asset Management
              </p>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: C.white, margin: 0, letterSpacing: '-0.02em', fontFamily: FONT }}>
                Asset Dashboard
              </h1>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', fontWeight: 500, fontFamily: FONT }}>
                Enterprise Asset Intelligence
              </p>
            </div>
          </div>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', background: 'rgba(255,255,255,0.12)',
            color: C.white, border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 12,
            fontFamily: FONT, backdropFilter: 'blur(8px)',
          }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Debug Banner */}
        <DebugBanner summary={summary} />

        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
          <KpiCard label="Total Assets"       value={fmt(summary.total_assets)}       sub="All records in Salesforce"                              icon={Package}      accent={C.blue}    />
          <KpiCard label="Available Assets"   value={fmt(summary.available_assets)}                                   icon={CheckCircle2} accent={C.green}
            warning={summary.available_assets === 0 && summary.total_assets > 0 ? 'Showing 0 — Is_Available__c may not be set' : undefined} />
          <KpiCard label="Asset Types"        value={fmt(summary.distinct_types)}     sub="Distinct categories"                                    icon={Layers}       accent="#7c3aed"   />
          <KpiCard label="Total Cost – Aspect" value={fmtGBP(summary.total_cost)}    sub={summary.price_field_used ? `Field: ${summary.price_field_used}` : 'SUM(Price) from Salesforce'} icon={PoundSterlingIcon}   accent={C.blueDark}
            warning={summary.total_cost === 0 && summary.total_assets > 0 ? 'Showing £0 — Price field may be empty' : undefined} />
          <KpiCard label="Cost Per Asset"     value={fmtGBP(summary.avg_cost_per_asset)} sub="Portfolio average"                                   icon={TrendingUp}   accent={C.orange}  />
        </div>

        {/* ASSET TYPE CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Bar chart */}
          <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(39,84,157,0.07)', border: `1px solid ${C.borderSubtle}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 900, color: C.title, margin: '0 0 3px', fontFamily: FONT }}>
                  {activeTab === 'types' ? 'Assets by Type' : 'Cost by Asset Type'}
                </h2>
                <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>
                  {activeTab === 'types' ? 'Count per type' : 'SUM(Price) per type — £'}
                </p>
              </div>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                {(['types','cost'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '6px 14px', border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 12,
                    background: activeTab === tab ? C.blue : C.white,
                    color: activeTab === tab ? C.white : C.gray,
                  }}>
                    {tab === 'types' ? 'Count' : 'Cost £'}
                  </button>
                ))}
              </div>
            </div>
            {activeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={activeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                  <YAxis type="category" dataKey="name" stroke={C.gray} style={{ fontSize: '11px', fontWeight: 600, fontFamily: FONT }} width={120} tickFormatter={v => v.length > 16 ? `${v.slice(0,16)}…` : v} />
                  <XAxis type="number" stroke={C.gray} style={{ fontSize: '11px', fontFamily: FONT }}
                    tickFormatter={v => activeTab === 'cost' ? `£${(v/1000).toFixed(0)}k` : fmt(v)} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="value" name={activeTab === 'cost' ? '£ Spend' : 'Assets'} radius={[0,6,6,0]}>
                    {activeChartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                message={activeTab === 'types' ? 'No type data available' : 'No cost data available'}
                hint={activeTab === 'cost' ? 'Ensure Price field is populated in Salesforce' : 'Assets may not have Asset_Type__c set'}
              />
            )}
          </div>

          {/* Pie chart */}
          <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(39,84,157,0.07)', border: `1px solid ${C.borderSubtle}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: C.title, margin: '0 0 3px', fontFamily: FONT }}>Type Distribution</h2>
            <p style={{ fontSize: 11, color: C.gray, margin: '0 0 16px', fontFamily: FONT }}>Proportion of assets per type</p>
            {typeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={typeChartData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                    {typeChartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                  <Legend verticalAlign="bottom" iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12, fontFamily: FONT }}
                    formatter={v => v.length > 20 ? `${v.slice(0,20)}…` : v} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No type distribution data" hint="Asset_Type__c field may not be populated or mapped" />
            )}
          </div>
        </div>

        {/* COST PANEL */}
        <CostPanel summary={summary} />

        {/* ALLOCATION PANEL */}
        <AllocationPanel allocations={allocs} total={allocData?.total ?? summary.allocations?.length ?? 0} />

        {/* ASSET LOOKUP TABLE */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(39,84,157,0.07)', border: `1px solid ${C.borderSubtle}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blueSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search style={{ width: 16, height: 16, color: C.blue }} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 900, color: C.title, margin: '0 0 2px', fontFamily: FONT }}>
                  Asset Lookup <span style={{ color: C.blue }}>({fmt(lookup?.total ?? 0)})</span>
                </h2>
                <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>
                  Showing {fmt(filteredAssets.length)} of {fmt(lookup?.returned ?? 0)} fetched
                </p>
              </div>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.gray }} />
              <input
                type="text"
                placeholder="Search name, serial, type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                  border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13,
                  fontFamily: FONT, outline: 'none', background: C.white,
                  color: C.body, width: 240,
                }}
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.blueBorder}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 520, borderRadius: 10, border: `1px solid ${C.borderSubtle}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
              <thead style={{ background: C.blueSubtle, position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {['#','Name','Status','Available','Asset Type','Serial No.','Install Date','Created','Price'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: C.blueDark, borderBottom: `1px solid ${C.blueBorder}`, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: FONT }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: C.gray, fontSize: 13, fontFamily: FONT }}>
                      {search ? 'No assets match your search.' : 'No assets loaded.'}
                    </td>
                  </tr>
                ) : filteredAssets.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.borderSubtle}`, transition: 'background 0.1s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.blueSubtle)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', color: C.gray, fontSize: 11, fontFamily: 'monospace' }}>{i+1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: C.title, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT }}>{a.name}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={a.status} /></td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status="" available={a.is_available} /></td>
                    <td style={{ padding: '12px 16px', color: C.graySubtle, fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT }}>{a.asset_type ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: C.graySubtle, fontSize: 11, fontFamily: 'monospace' }}>{a.serial_number ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: C.graySubtle, fontSize: 12, whiteSpace: 'nowrap', fontFamily: FONT }}>{fmtDate(a.install_date)}</td>
                    <td style={{ padding: '12px 16px', color: C.graySubtle, fontSize: 12, whiteSpace: 'nowrap', fontFamily: FONT }}>{fmtDate(a.created_date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 800, color: C.blue, whiteSpace: 'nowrap', fontFamily: FONT }}>
                      {a.price && a.price > 0 ? fmtGBP(a.price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}