import { useEffect, useState, useMemo } from 'react';
import {
  ArrowRightLeft, RefreshCw, Search, Calendar,
  Filter, X, Download,
  TrendingUp, Package, Clock, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';

// ── Design system ─────────────────────────────────────────────────────────────
const C = {
  blue:         "#27549D",
  blueLight:    "#7099DB",
  blueDark:     "#17325E",
  blueSubtle:   "#F7F9FD",
  blueBorder:   "#DEE8F7",
  yellow:       "#F1FF24",
  green:        "#2EB844",
  orange:       "#F29630",
  red:          "#D15134",
  redSubtle:    "#FAEDEA",
  gray:         "#848EA3",
  body:         "#323843",
  title:        "#1A1D23",
  border:       "#CDD1DA",
  borderSubtle: "#F3F4F6",
  bg:           "#F3F4F6",
  white:        "#FFFFFF",
};

const FONT   = "'Mont', sans-serif";
const COLORS = [C.blue, C.blueLight, C.green, C.orange, C.red, C.blueDark, C.gray];

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
const PAGE_SIZE = 50;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Allocation {
  asset_id:     string | null;
  asset_name:   string | null;
  old_value:    string | null;
  new_value:    string | null;
  created_date: string | null;
}
interface ApiResponse {
  success: boolean; total: number; returned: number; allocations: Allocation[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return { date: '—', time: '' };
  try {
    const d = new Date(s);
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch { return { date: s, time: '' }; }
};

const fmt     = (v: unknown) => Number(v).toLocaleString('en-GB');
const isRawId = (s: string)  => /^[a-zA-Z0-9]{15,18}$/.test((s || '').trim());

function topByCount(allocs: Allocation[], key: keyof Allocation, n = 8) {
  const map: Record<string, number> = {};
  allocs.forEach(a => {
    const v = a[key];
    if (v && !isRawId(v as string)) map[v as string] = (map[v as string] || 0) + 1;
  });
  return Object.entries(map).sort((x, y) => y[1] - x[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

function monthlyTrend(allocs: Allocation[]) {
  const map: Record<string, number> = {};
  allocs.forEach(a => {
    if (!a.created_date) return;
    const d   = new Date(a.created_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key]  = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort().slice(-12).map(([k, v]) => ({
    name:  new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    value: v,
  }));
}

function exportCSV(rows: Allocation[]) {
  const header = 'Asset Name,From,To,Date,Time\n';
  const body   = rows.map(r => {
    const dt = fmtDate(r.created_date);
    return [`"${r.asset_name ?? ''}"`, `"${r.old_value ?? ''}"`, `"${r.new_value ?? ''}"`, `"${dt.date}"`, `"${dt.time}"`].join(',');
  }).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `asset-allocation-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(39,84,157,0.10)", fontFamily: FONT,
    }}>
      <p style={{ fontSize: 11, color: C.gray, margin: "0 0 4px", fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: C.blue, margin: 0 }}>
        {fmt(payload[0]?.value)} moves
      </p>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub: string; accent: string; icon: any;
}) {
  return (
    <div style={{
      background: C.white, borderRadius: 16, padding: "22px 24px",
      boxShadow: "0 2px 12px rgba(39,84,157,0.07)",
      border: `1px solid ${C.borderSubtle}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: accent, opacity: 0.07 }} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 20, height: 20, color: accent }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: C.gray, margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 900, color: C.title, margin: "0 0 2px", fontFamily: FONT, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>{sub}</p>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: C.title, margin: "0 0 2px", fontFamily: FONT }}>{title}</h3>
      <p style={{ fontSize: 11, color: C.gray, margin: "0 0 16px", fontFamily: FONT }}>{sub}</p>
      {children}
    </div>
  );
}

// ── Val chip ──────────────────────────────────────────────────────────────────
function ValChip({ val, green = false }: { val: string | null; green?: boolean }) {
  if (!val) return <span style={{ color: C.border, fontStyle: "italic", fontSize: 11, fontFamily: FONT }}>unassigned</span>;
  if (isRawId(val)) return (
    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "monospace", background: C.borderSubtle, color: C.gray, border: `1px solid ${C.border}` }}>
      {val.slice(0, 6)}…{val.slice(-3)}
    </span>
  );
  return <span style={{ fontWeight: 700, fontSize: 12, fontFamily: FONT, color: green ? C.green : C.body }}>{val}</span>;
}

// ── Aspect Logo — renders the SVG file, proper size, no clipping ──────────────
// The container is sized generously and overflow:visible so nothing gets cut.
// A pure-inline-SVG fallback fires if the file fails to load.
function AspectLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Inline fallback that replicates the Aspect icon (blue pentagon + yellow blocks)
    return (
      <svg viewBox="0 0 100 100" width="52" height="52" style={{ display: "block" }}>
        {/* Pentagon arrow background */}
        <path d="M8 10 C8 4 12 0 18 0 H68 L100 50 L68 100 H18 C12 100 8 96 8 90 Z" fill="#27549D" />
        {/* Yellow grid blocks */}
        <rect x="16" y="14" width="18" height="14" rx="2" fill="#F1FF24" />
        <rect x="16" y="34" width="18" height="14" rx="2" fill="#F1FF24" />
        <rect x="16" y="54" width="18" height="14" rx="2" fill="#F1FF24" />
        <rect x="16" y="74" width="18" height="14" rx="2" fill="#F1FF24" />
        <rect x="40" y="14" width="12" height="14" rx="2" fill="#F1FF24" />
        <rect x="40" y="34" width="12" height="14" rx="2" fill="#F1FF24" />
        <rect x="40" y="54" width="30" height="14" rx="2" fill="#F1FF24" />
        <rect x="40" y="74" width="30" height="14" rx="2" fill="#F1FF24" />
        <rect x="58" y="14" width="24" height="28" rx="2" fill="#F1FF24" />
      </svg>
    );
  }

  return (
    <img
      src="/aspect-logo-icon.svg"
      alt="Aspect logo"
      onError={() => setFailed(true)}
      style={{
        width: 52,
        height: 52,
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AssetAllocation() {
  const [data,        setData]        = useState<ApiResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [filterTo,    setFilterTo]    = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [page,        setPage]        = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res  = await fetch(`${API_BASE}/api/allocation/?limit=2000`);
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allocs        = data?.allocations ?? [];
  const recentCount   = useMemo(() => { const c = new Date(); c.setDate(c.getDate() - 30); return allocs.filter(a => a.created_date && new Date(a.created_date) >= c).length; }, [allocs]);
  const topAssets     = useMemo(() => topByCount(allocs, 'asset_name'), [allocs]);
  const topRecipients = useMemo(() => topByCount(allocs, 'new_value'),  [allocs]);
  const trend         = useMemo(() => monthlyTrend(allocs),             [allocs]);
  const uniqueAssets  = useMemo(() => [...new Set(allocs.map(a => a.asset_name).filter(Boolean))].sort() as string[], [allocs]);
  const uniqueTo      = useMemo(() => [...new Set(allocs.map(a => a.new_value).filter(v => v && !isRawId(v)))].sort() as string[], [allocs]);

  const activeFilters = [search, filterAsset, filterTo, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters  = () => { setSearch(''); setFilterAsset(''); setFilterTo(''); setDateFrom(''); setDateTo(''); setPage(1); };

  const filtered = useMemo(() => allocs.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!((a.asset_name ?? '').toLowerCase().includes(q) || (a.new_value ?? '').toLowerCase().includes(q) || (a.old_value ?? '').toLowerCase().includes(q))) return false;
    }
    if (filterAsset && a.asset_name !== filterAsset) return false;
    if (filterTo    && a.new_value  !== filterTo)    return false;
    if (dateFrom || dateTo) {
      const d = a.created_date ? new Date(a.created_date) : null;
      if (!d) return false;
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  }), [allocs, search, filterAsset, filterTo, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filterAsset, filterTo, dateFrom, dateTo]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", border: `3px solid ${C.blueBorder}`, borderTopColor: C.blue, animation: "spin 0.75s linear infinite" }} />
      <p style={{ color: C.gray, fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>Loading allocation history…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: 12 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.redSubtle, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ArrowRightLeft style={{ color: C.red, width: 24, height: 24 }} />
        </div>
        <p style={{ color: C.red, fontFamily: FONT, fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>Failed to load</p>
        <p style={{ color: C.gray, fontSize: 13, fontFamily: FONT, margin: "0 0 20px" }}>{error}</p>
        <button onClick={load} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT }}>
      <style>{`
        /* ── Mont font — served from /fonts/ ── */
        @font-face { font-family:'Mont'; src:url('/fonts/MontHeavy/MontHeavy.otf') format('opentype'); font-weight:900; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBold/MontBold.otf') format('opentype'); font-weight:700; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontSemiBold/MontSemiBold.otf') format('opentype'); font-weight:600; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontRegular/MontRegular.otf') format('opentype'); font-weight:400; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontLight/MontLight.otf') format('opentype'); font-weight:300; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontHeavyItalic/MontHeavyItalic.otf') format('opentype'); font-weight:900; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBoldItalic/MontBoldItalic.otf') format('opentype'); font-weight:700; font-style:italic; }
        * { box-sizing: border-box; }
        body, * { font-family: 'Mont', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.borderSubtle}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        .trow:hover { background: ${C.blueSubtle} !important; }
        input:focus, select:focus { outline: none; border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.blueBorder}; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", overflow: "hidden", padding: "28px 36px 80px", minHeight: 180 }}>
        {/* Background image */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/profile_header.jpg')", backgroundSize: "cover", backgroundPosition: "center", zIndex: 0 }} />
        {/* Brand overlay */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: `linear-gradient(135deg, ${C.blueDark}EE 0%, ${C.blue}CC 55%, ${C.blueLight}99 100%)` }} />
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)", zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: -50, right: 200, width: 140, height: 140, borderRadius: "50%", background: "rgba(241,255,36,0.08)", zIndex: 1 }} />

        {/* Content */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

            {/*
              Logo container:
              - overflow: visible  → SVG is NEVER clipped by the rounded box
              - the glassmorphism card is purely a backdrop; the logo sits on top at full size
            */}
            <div style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "visible",   // ← KEY: never clips the logo
            }}>
              <AspectLogo />
            </div>

            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT }}>
                Asset Management
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: C.white, margin: 0, letterSpacing: "-0.02em", fontFamily: FONT }}>
                Allocation History
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "4px 0 0", fontWeight: 500, fontFamily: FONT }}>
                {fmt(data.total)} total movements recorded
              </p>
            </div>
          </div>

          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.12)", color: C.white,
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10,
            padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13,
            fontFamily: FONT, backdropFilter: "blur(8px)",
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 36px", marginTop: -52, position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard label="Total Movements"  value={fmt(data.total)}          sub="All recorded re-assignments"      accent={C.blue}      icon={ArrowRightLeft} />
          <StatCard label="Last 30 Days"     value={fmt(recentCount)}          sub="Movements this month"             accent={C.green}     icon={Clock} />
          <StatCard label="Assets Moved"     value={fmt(uniqueAssets.length)}  sub="Distinct assets re-assigned"      accent={C.orange}    icon={Package} />
          <StatCard label="Avg Moves/Asset"  value={uniqueAssets.length > 0 ? (data.total / uniqueAssets.length).toFixed(1) : "0"} sub="Average times each asset moved" accent={C.blueLight} icon={TrendingUp} />
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 36px 40px" }}>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
          <ChartCard title="Most Moved Assets" sub="Top 8 assets by re-assignments">
            {topAssets.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topAssets} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                  <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.body, fontWeight: 600 }} tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.gray }} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: C.blueSubtle }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {topAssets.map((_, i) => <Cell key={i} fill={i === 0 ? C.yellow : COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </ChartCard>

          <ChartCard title="Top Recipients" sub="Who received the most assets">
            {topRecipients.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topRecipients} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                  <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.body, fontWeight: 600 }} tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.gray }} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: C.blueSubtle }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {topRecipients.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData message="No named recipients (IDs only)" />}
          </ChartCard>

          <ChartCard title="Monthly Trend" sub="Re-assignments per month (last 12)">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.gray, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontFamily: FONT, fill: C.gray }} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: C.blueSubtle }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {trend.map((_, i) => <Cell key={i} fill={i === trend.length - 1 ? C.yellow : C.blue} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </ChartCard>
        </div>

        {/* ── TABLE ────────────────────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>

          {/* Toolbar */}
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.borderSubtle}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowRightLeft style={{ width: 18, height: 18, color: C.blue }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: C.title, margin: 0, fontFamily: FONT }}>
                    Full Allocation Log <span style={{ color: C.blue }}>({fmt(filtered.length)})</span>
                  </h2>
                  <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>Page {page} of {totalPages} · {PAGE_SIZE} per page</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.gray }} />
                  <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, width: 180, color: C.body, background: C.white }} />
                </div>

                <button onClick={() => setShowFilters(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${showFilters || activeFilters > 0 ? C.blue : C.border}`, background: showFilters || activeFilters > 0 ? C.blue : C.white, color: showFilters || activeFilters > 0 ? C.white : C.body, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
                  <Filter style={{ width: 13, height: 13 }} /> Filters
                  {activeFilters > 0 && <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilters}</span>}
                </button>

                {activeFilters > 0 && (
                  <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: `1px solid ${C.red}`, borderRadius: 9, background: C.redSubtle, color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
                    <X style={{ width: 12, height: 12 }} /> Clear
                  </button>
                )}

                <button onClick={() => exportCSV(filtered)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", borderRadius: 9, background: C.blue, color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT, boxShadow: "0 2px 8px rgba(39,84,157,0.25)" }}>
                  <Download style={{ width: 13, height: 13 }} /> Export CSV
                </button>
              </div>
            </div>

            {showFilters && (
              <div style={{ marginTop: 14, background: C.blueSubtle, borderRadius: 10, padding: 16, border: `1px solid ${C.blueBorder}`, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Asset Name",  value: filterAsset, options: uniqueAssets, onChange: setFilterAsset, placeholder: "All assets" },
                  { label: "Assigned To", value: filterTo,    options: uniqueTo,     onChange: setFilterTo,    placeholder: "All recipients" },
                ].map(({ label, value, options, onChange, placeholder }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: C.blue, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT }}>{label}</p>
                    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: FONT, background: C.white, color: C.body }}>
                      <option value="">{placeholder}</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {[
                  { label: "From Date", value: dateFrom, onChange: setDateFrom },
                  { label: "To Date",   value: dateTo,   onChange: setDateTo },
                ].map(({ label, value, onChange }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: C.blue, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT }}>{label}</p>
                    <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: FONT, background: C.white, color: C.body }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.blueSubtle }}>
                  {["#", "Asset Name", "From", "To (Assigned)", "Date", "Time"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 20px", fontWeight: 800, fontSize: 10, color: C.blueDark, borderBottom: `1px solid ${C.blueBorder}`, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <NoData message={activeFilters > 0 ? "No records match your filters" : "No allocation history found"} tall />
                      {activeFilters > 0 && (
                        <div style={{ textAlign: "center", paddingBottom: 24 }}>
                          <button onClick={clearFilters} style={{ color: C.blue, fontSize: 12, fontWeight: 700, fontFamily: FONT, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear all filters</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : paginated.map((a, i) => {
                  const dt = fmtDate(a.created_date);
                  return (
                    <tr key={`${a.asset_id}-${i}`} className="trow" style={{ borderBottom: `1px solid ${C.borderSubtle}`, transition: "background 0.12s" }}>
                      <td style={{ padding: "12px 20px", color: C.gray, fontWeight: 700, fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.blueSubtle, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Package style={{ width: 14, height: 14, color: C.blue }} />
                          </div>
                          <span style={{ fontWeight: 700, color: C.title, fontSize: 13 }}>{a.asset_name ?? '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.border, flexShrink: 0, display: "inline-block" }} />
                          <ValChip val={a.old_value} />
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, flexShrink: 0, display: "inline-block" }} />
                          <ValChip val={a.new_value} green />
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Calendar style={{ width: 13, height: 13, color: C.gray, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: C.body, fontWeight: 600 }}>{dt.date}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: 11, color: C.gray, fontFamily: "monospace", whiteSpace: "nowrap" }}>{dt.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontSize: 11, color: C.gray, fontFamily: FONT, margin: 0 }}>
                Rows <b>{(page - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(page * PAGE_SIZE, filtered.length)}</b> of <b>{fmt(filtered.length)}</b>
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[{ label: "«", action: () => setPage(1), disabled: page === 1 }, { label: "‹", action: () => setPage(p => p - 1), disabled: page === 1 }].map(({ label, action, disabled }) => (
                  <button key={label} onClick={action} disabled={disabled} style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, color: disabled ? C.border : C.body, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>{label}</button>
                ))}
                {(() => {
                  const range: number[] = [];
                  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) range.push(p);
                  return range.map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${p === page ? C.blue : C.border}`, background: p === page ? C.blue : C.white, color: p === page ? C.white : C.body, cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: FONT }}>{p}</button>
                  ));
                })()}
                {[{ label: "›", action: () => setPage(p => p + 1), disabled: page === totalPages }, { label: "»", action: () => setPage(totalPages), disabled: page === totalPages }].map(({ label, action, disabled }) => (
                  <button key={label} onClick={action} disabled={disabled} style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, color: disabled ? C.border : C.body, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>{label}</button>
                ))}
                <span style={{ fontSize: 11, color: C.gray, fontFamily: FONT, marginLeft: 4 }}>{page}/{totalPages}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoData({ message = "No data available", tall }: { message?: string; tall?: boolean }) {
  return (
    <div style={{ height: tall ? 160 : 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: C.borderSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BarChart2 style={{ width: 18, height: 18, color: C.border }} />
      </div>
      <p style={{ color: C.gray, fontSize: 13, fontFamily: FONT, fontWeight: 600, margin: 0 }}>{message}</p>
    </div>
  );
}