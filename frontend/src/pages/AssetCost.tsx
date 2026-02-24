import { useEffect, useState, useMemo } from "react";
import {
  PoundSterlingIcon, Search, Download, RefreshCw, Filter,
  TrendingUp, Package, BarChart2, ArrowUpRight, ArrowDownRight,
  PoundSterling,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ── Design system (exact brand palette) ──────────────────────────────────────
const C = {
  // Brand
  blue:         "#27549D",
  yellow:       "#F1FF24",
  // Support
  green:        "#2EB844",
  orange:       "#F29630",
  red:          "#D15134",
  gray:         "#848EA3",
  // Primary shades
  blueLight:    "#7099DB",
  blueDark:     "#17325E",
  blueSubtle:   "#F7F9FD",
  blueBorder:   "#DEE8F7",
  // Error shades
  redSubtle:    "#FAEDEA",
  // Warning shades
  orangeSubtle: "#FEF5EC",
  // Green subtle
  greenSubtle:  "#ECFDF5",
  // Grayscale
  title:        "#1A1D23",
  body:         "#323843",
  graySubtle:   "#646F86",
  border:       "#CDD1DA",
  borderSubtle: "#F3F4F6",
  bg:           "#F3F4F6",
  white:        "#FFFFFF",
};

// Mont font — loaded from /fonts/ (local, NOT Google Fonts)
const FONT = "'Mont', sans-serif";

const PIE_COLORS = [C.blue, C.blueLight, C.green, C.orange, C.red, C.blueDark, C.gray, C.graySubtle];

// ── Interfaces ────────────────────────────────────────────────────────────────
interface AssetCost {
  id: string;
  name: string;
  price: number;
  asset_type?: string;
  purchase_date?: string;
  status?: string;
}
interface CostByType {
  type_id: string;
  type_name: string;
  total_spend: number;
  asset_count: number;
  average_cost: number;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(39,84,157,0.10)", fontFamily: FONT,
    }}>
      <p style={{ fontSize: 11, color: C.gray, margin: "0 0 4px", fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 14, fontWeight: 800, color: C.blue, margin: 0 }}>
          £{Number(p.value).toLocaleString("en-GB")}
        </p>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon: Icon, trend }: {
  label: string; value: string; sub: string;
  accent: string; icon: any; trend?: number;
}) {
  return (
    <div style={{
      background: C.white, borderRadius: 16, padding: "22px 24px",
      boxShadow: "0 2px 12px rgba(39,84,157,0.07)",
      border: `1px solid ${C.borderSubtle}`,
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 90, height: 90, borderRadius: "50%", background: accent, opacity: 0.07 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 20, height: 20, color: accent }} />
        </div>
        {trend !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: trend >= 0 ? C.green : C.red, fontFamily: FONT }}>
            {trend >= 0 ? <ArrowUpRight style={{ width: 13, height: 13 }} /> : <ArrowDownRight style={{ width: 13, height: 13 }} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize: 11, color: C.gray, margin: "0 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: C.title, margin: "0 0 2px", fontFamily: FONT, lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>{sub}</p>
      </div>
    </div>
  );
}

// ── Aspect Logo (with inline-SVG fallback) ────────────────────────────────────
function AspectLogo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <svg viewBox="0 0 100 100" width="52" height="52" style={{ display: "block" }}>
        <path d="M8 10 C8 4 12 0 18 0 H68 L100 50 L68 100 H18 C12 100 8 96 8 90 Z" fill="#27549D" />
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
      alt="Aspect"
      onError={() => setFailed(true)}
      style={{ width: 52, height: 52, display: "block", objectFit: "contain" }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetCost() {
  const [assets,         setAssets]         = useState<AssetCost[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetCost[]>([]);
  const [costByType,     setCostByType]     = useState<CostByType[]>([]);
  const [totalSpend,     setTotalSpend]     = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [activeTab,      setActiveTab]      = useState<"overview" | "details">("overview");

  useEffect(() => { loadCostData(); }, []);

  const loadCostData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, costsRes, typeRes] = await Promise.all([
        fetch("/api/dashboard/asset-cost-summary"),
        fetch("/api/dashboard/asset-costs"),
        fetch("/api/dashboard/asset-cost-by-type"),
      ]);
      if (summaryRes.ok) { const s = await summaryRes.json(); setTotalSpend(s.total_spend || 0); }
      if (costsRes.ok)   { const d = await costsRes.json();   if (d.success && Array.isArray(d.assets))          { setAssets(d.assets); setFilteredAssets(d.assets); } }
      if (typeRes.ok)    { const t = await typeRes.json();    if (t.success && Array.isArray(t.cost_by_type))    setCostByType(t.cost_by_type); }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredAssets(term ? assets.filter(a => a.name?.toLowerCase().includes(term)) : assets);
  }, [searchTerm, assets]);

  const stats = useMemo(() => {
    const total = filteredAssets.reduce((s, a) => s + (a.price || 0), 0);
    const avg   = filteredAssets.length > 0 ? total / filteredAssets.length : 0;
    const max   = filteredAssets.length > 0 ? Math.max(...filteredAssets.map(a => a.price || 0)) : 0;
    return { total, avg, max };
  }, [filteredAssets]);

  const costByTypeData = useMemo(() =>
    costByType.map(i => ({ name: i.type_name.substring(0, 18), cost: Math.round(i.total_spend), count: i.asset_count }))
      .sort((a, b) => b.cost - a.cost).slice(0, 8),
  [costByType]);

  const topAssetsData = useMemo(() =>
    [...filteredAssets].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 8)
      .map(a => ({ name: a.name.substring(0, 20), cost: Math.round(a.price || 0) })),
  [filteredAssets]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: `3px solid ${C.blueBorder}`, borderTopColor: C.blue, animation: "spin 0.75s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: C.gray, fontFamily: FONT, fontSize: 14, fontWeight: 600 }}>Loading asset costs…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center", background: C.white, borderRadius: 16, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.redSubtle, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <PoundSterling style={{ color: C.red, width: 24, height: 24 }} />
        </div>
        <p style={{ color: C.red, fontFamily: FONT, fontSize: 16, fontWeight: 800, margin: "0 0 8px" }}>Failed to load data</p>
        <p style={{ color: C.gray, fontSize: 13, margin: "0 0 20px", fontFamily: FONT }}>{error}</p>
        <button onClick={loadCostData} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT }}>
      <style>{`
        /* ── Mont font faces — served from /fonts/ (NO Google Fonts) ── */
        @font-face { font-family:'Mont'; src:url('/fonts/MontHeavy/MontHeavy.otf') format('opentype');         font-weight:900; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontHeavyItalic/MontHeavyItalic.otf') format('opentype'); font-weight:900; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBold/MontBold.otf') format('opentype');           font-weight:700; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBoldItalic/MontBoldItalic.otf') format('opentype'); font-weight:700; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontSemiBold/MontSemiBold.otf') format('opentype');   font-weight:600; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontSemiBoldItalic/MontSemiBoldItalic.otf') format('opentype'); font-weight:600; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontRegular/MontRegular.otf') format('opentype');     font-weight:400; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontRegularItalic/MontRegularItalic.otf') format('opentype'); font-weight:400; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontLight/MontLight.otf') format('opentype');         font-weight:300; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontLightItalic/MontLightItalic.otf') format('opentype'); font-weight:300; font-style:italic; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBook/MontBook.otf') format('opentype');           font-weight:350; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontThin/MontThin.otf') format('opentype');           font-weight:100; font-style:normal; }
        @font-face { font-family:'Mont'; src:url('/fonts/MontBlack/MontBlack.otf') format('opentype');         font-weight:950; font-style:normal; }

        * { box-sizing: border-box; }
        body, * { font-family: 'Mont', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.borderSubtle}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        .row-hover:hover  { background: ${C.blueSubtle} !important; }
        .btn-hover:hover  { opacity: 0.85; transform: translateY(-1px); }
        .card-hover:hover { box-shadow: 0 6px 24px rgba(39,84,157,0.13) !important; transform: translateY(-2px); transition: all 0.2s; }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", overflow: "hidden", padding: "28px 36px 80px", minHeight: 180 }}>
        {/* profile_header.jpg background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('/profile_header.jpg')",
          backgroundSize: "cover", backgroundPosition: "center", zIndex: 0,
        }} />
        {/* Brand colour overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: `linear-gradient(135deg, ${C.blueDark}EE 0%, ${C.blue}CC 60%, ${C.blueLight}99 100%)`,
        }} />
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40,  width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)", zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: -60, right: 120, width: 160, height: 160, borderRadius: "50%", background: "rgba(241,255,36,0.08)", zIndex: 1 }} />

        {/* Content */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

            {/* Logo box — overflow:visible so SVG is never clipped */}
            <div style={{
              width: 68, height: 68, borderRadius: 18,
              background: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, overflow: "visible",
            }}>
              <AspectLogo />
            </div>

            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: "0 0 2px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT }}>
                Asset Management
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: C.white, margin: 0, letterSpacing: "-0.02em", fontFamily: FONT }}>
                Cost Tracking
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "4px 0 0", fontWeight: 500, fontFamily: FONT }}>
                {assets.length > 0 ? `${assets.length} assets tracked` : "Asset cost overview"}
              </p>
            </div>
          </div>

          <button onClick={loadCostData} className="btn-hover" style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.12)", color: C.white,
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10,
            padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13,
            fontFamily: FONT, transition: "all 0.2s", backdropFilter: "blur(8px)",
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STAT CARDS (overlapping header) ────────────────────────────────── */}
      <div style={{ padding: "0 36px", marginTop: -52, position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard label="Total Spend"   value={`£${totalSpend.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`} sub={`${assets.length} assets tracked`}  accent={C.blue}      icon={PoundSterling}  trend={4.2}  />
          <StatCard label="Average Cost"  value={`£${stats.avg.toLocaleString("en-GB",   { maximumFractionDigits: 0 })}`} sub="Per asset"                           accent={C.green}     icon={TrendingUp}  trend={-1.8} />
          <StatCard label="Highest Asset" value={`£${stats.max.toLocaleString("en-GB",   { maximumFractionDigits: 0 })}`} sub="Single most expensive"               accent={C.blueLight} icon={BarChart2}              />
          <StatCard label="Asset Types"   value={`${costByType.length}`}                                                   sub="Categories with spend"              accent={C.orange}    icon={Package}                />
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 36px 40px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C.white, borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {(["overview", "details"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 24px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: FONT, fontSize: 13, fontWeight: 700, transition: "all 0.18s",
              background: activeTab === tab ? C.blue : "transparent",
              color: activeTab === tab ? C.white : C.gray,
              textTransform: "capitalize",
            }}>
              {tab === "overview" ? "📊 Overview" : "📋 Asset Details"}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Bar chart — spend by type */}
              <div className="card-hover" style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: C.title, margin: "0 0 2px", fontFamily: FONT }}>Spend by Asset Type</h3>
                    <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>Total expenditure per category</p>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BarChart2 style={{ width: 16, height: 16, color: C.blue }} />
                  </div>
                </div>
                {costByTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={costByTypeData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: FONT, fill: C.gray }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fontFamily: FONT, fill: C.gray }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: C.blueSubtle }} />
                      <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                        {costByTypeData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? C.yellow : i === 1 ? C.blue : C.blueLight} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <NoData />}
              </div>

              {/* Pie chart — cost distribution */}
              <div className="card-hover" style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.title, margin: "0 0 2px", fontFamily: FONT }}>Cost Distribution</h3>
                  <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>Share of spend by type</p>
                </div>
                {costByTypeData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={costByTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="cost" paddingAngle={3}>
                          {costByTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`£${Number(v).toLocaleString("en-GB")}`, "Spend"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {costByTypeData.slice(0, 4).map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: C.body, fontFamily: FONT, fontWeight: 600 }}>{item.name}</span>
                          </div>
                          <span style={{ fontSize: 11, color: C.blue, fontFamily: FONT, fontWeight: 800 }}>
                            £{item.cost.toLocaleString("en-GB")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <NoData />}
              </div>
            </div>

            {/* Top 8 most expensive assets */}
            <div className="card-hover" style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.title, margin: "0 0 2px", fontFamily: FONT }}>Top 8 Most Expensive Assets</h3>
                  <p style={{ fontSize: 11, color: C.gray, margin: 0, fontFamily: FONT }}>Ranked by purchase value</p>
                </div>
                <span style={{
                  fontSize: 11, color: C.blue, fontWeight: 700, fontFamily: FONT,
                  background: C.blueSubtle, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.blueBorder}`,
                }}>Top 8</span>
              </div>
              {topAssetsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topAssetsData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: FONT, fill: C.gray }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 11, fontFamily: FONT, fill: C.body, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: C.blueSubtle }} />
                    <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                      {topAssetsData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? C.yellow : i < 3 ? C.blue : C.blueLight} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoData />}
            </div>
          </>
        )}

        {/* ── DETAILS TAB ──────────────────────────────────────────────────── */}
        {activeTab === "details" && (
          <>
            {/* Search / filter bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: C.gray }} />
                <input
                  placeholder="Search assets by name…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px 11px 38px",
                    border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13,
                    fontFamily: FONT, outline: "none", background: C.white,
                    color: C.body, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
              <button className="btn-hover" style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 18px", border: `1px solid ${C.border}`, borderRadius: 10,
                background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700,
                fontFamily: FONT, color: C.body, transition: "all 0.15s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <Filter style={{ width: 14, height: 14 }} /> Filter
              </button>
              <button className="btn-hover" style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 18px", border: "none", borderRadius: 10,
                background: C.blue, cursor: "pointer", fontSize: 13, fontWeight: 700,
                fontFamily: FONT, color: C.white, transition: "all 0.15s",
                boxShadow: "0 2px 8px rgba(39,84,157,0.25)",
              }}>
                <Download style={{ width: 14, height: 14 }} /> Export
              </button>
            </div>

            {/* Table */}
            <div style={{ background: C.white, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(39,84,157,0.07)", border: `1px solid ${C.borderSubtle}` }}>
              <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: C.title, margin: 0, fontFamily: FONT }}>Asset Cost Details</h3>
                <span style={{ fontSize: 12, color: C.gray, fontFamily: FONT, fontWeight: 600 }}>{filteredAssets.length} records</span>
              </div>

              {filteredAssets.length === 0 ? (
                <NoData message="No assets match your search." />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.blueSubtle }}>
                        {["#", "Asset Name", "Cost", "Type", "Status", "Purchase Date"].map(h => (
                          <th key={h} style={{
                            textAlign: h === "Cost" ? "right" : "left",
                            padding: "12px 20px", fontWeight: 800, fontSize: 11,
                            color: C.blueDark, borderBottom: `1px solid ${C.blueBorder}`,
                            fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset, i) => (
                        <tr key={asset.id || i} className="row-hover" style={{ borderBottom: `1px solid ${C.borderSubtle}`, transition: "background 0.12s" }}>
                          <td style={{ padding: "13px 20px", color: C.gray, fontWeight: 700, fontSize: 12 }}>{i + 1}</td>
                          <td style={{ padding: "13px 20px", fontWeight: 700, color: C.title, fontFamily: FONT }}>{asset.name}</td>
                          <td style={{ padding: "13px 20px", textAlign: "right" }}>
                            <span style={{ fontWeight: 900, color: C.blue, fontSize: 14, fontFamily: FONT }}>
                              £{(asset.price || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td style={{ padding: "13px 20px" }}>
                            <span style={{ background: C.blueSubtle, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                              {asset.asset_type || "N/A"}
                            </span>
                          </td>
                          <td style={{ padding: "13px 20px" }}>
                            <span style={{
                              background: asset.status === "Active" ? C.greenSubtle : C.borderSubtle,
                              color:      asset.status === "Active" ? C.green       : C.gray,
                              borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, fontFamily: FONT,
                            }}>
                              {asset.status || "N/A"}
                            </span>
                          </td>
                          <td style={{ padding: "13px 20px", color: C.graySubtle, fontWeight: 600, fontFamily: FONT }}>
                            {asset.purchase_date
                              ? new Date(asset.purchase_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── No Data placeholder ───────────────────────────────────────────────────────
function NoData({ message = "No data available" }: { message?: string }) {
  return (
    <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blueSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BarChart2 style={{ width: 20, height: 20, color: C.border }} />
      </div>
      <p style={{ color: C.gray, fontSize: 13, fontFamily: FONT, fontWeight: 600, margin: 0 }}>{message}</p>
    </div>
  );
}