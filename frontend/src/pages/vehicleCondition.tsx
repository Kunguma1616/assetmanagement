import React, { useState, useEffect } from "react";
import { getAllTradeGroups, RESTRICTED_USERS, isExcludedTrade } from '@/config/tradeMapping';
import { useUserTrade } from '@/hooks/useUserTrade';
import { Lock } from 'lucide-react';

/* ── Type Definitions ── */
interface VCRRecord {
  vehicleId: string;
  vanName: string;
  regNo: string;
  engineerName: string;
  trade: string;        // mapped category from backend e.g. "Building Fabric"
  rawTrade: string;     // original SF value e.g. "Carpentry"
  latestVcrDate: string | null;
  daysSince: number | null;
  status: "Submitted" | "Overdue" | "Missing";
  // enriched on frontend:
  tradeGroup?: string;
  displayGroup?: string;
}

interface DashboardData {
  totalAllocated: number;
  submittedCount: number;
  notSubmittedCount: number;
  submitted: VCRRecord[];
  notSubmitted: VCRRecord[];
  asOfDate: string;
}

interface AIImageReport {
  image_title: string;
  area_captured: string;
  overall_condition: "GREEN" | "AMBER" | "RED";
  damage_detected: boolean;
  damage_description: string;
  cleanliness: string;
  tyres_visible: boolean;
  tyre_condition: string;
  lights_visible: boolean;
  lights_condition: string;
  action_required: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  inspector_notes: string;
  engineer?: string;
  vehicle?: string;
  reg_no?: string;
  error?: string;
}

interface AIAnalysisResult {
  form_id: string;
  vehicle: string;
  reg_no: string;
  engineer: string;
  analysed_at: string;
  total_images: number;
  overall_fleet_status: "GREEN" | "AMBER" | "RED";
  reports: AIImageReport[];
  message?: string;
}

interface SearchResult {
  vehicle: string;
  latestVcr: {
    id: string;
    name: string;
    createdDate: string;
    engineer: string;
    description: string | null;
  } | null;
  images: Array<{
    id: string;
    title: string;
    fileExtension: string;
    imageUrl: string;
  }>;
}

/* ── Design Tokens ── */
const C = {
  brand: { blue: "#27549D", yellow: "#F1FF24" },
  primary: { light: "#7099DB", default: "#27549D", darker: "#17325E", subtle: "#F7F9FD" },
  error:   { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#FAEDEA" },
  warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FEF5EC" },
  success: { light: "#A8D5BA", default: "#40916C", darker: "#1B4B35", subtle: "#E8F5F1" },
  gray: {
    title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3",
    negative: "#F3F4F6", disabled: "#CDD1DA", border: "#CDD1DA",
    borderSubtle: "#E8EAEE", surface: "#F3F4F6",
  },
  text: {
    title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3",
    disabled: "#CDD1DA", negative: "#F3F4F6", primaryLabel: "#17325E",
    errorLabel: "#812F1D", warningLabel: "#A35C0A",
  },
  border: {
    primary: "#DEE8F7", error: "#F6DBD5", warning: "#FCE9D4",
    default: "#CDD1DA", subtle: "#E8EAEE",
  },
  surface: {
    primarySubtle: "#F7F9FD", errorSubtle: "#FAEDEA",
    warningSubtle: "#FEF5EC", successSubtle: "#E8F5F1",
  },
} as const;

const FONT    = "'Mont', 'Montserrat', sans-serif";
const API_BASE = "/api/vehicle-condition";

/* ── ENV trades for Lee sub-group ── */
const ENV_RAW_TRADES_LC = new Set([
  'environmental services', 'pest control', 'pest proofing',
  'sanitisation', 'sanitisation & specialist cleaning',
  'waste clearance', 'rubbish removal', 'gardening',
]);

/* ── Sub-trade mappings ── */
const SUB_TRADE_MAPPINGS: Record<string, string> = {
  'pest control': 'Pest Control',
  'pest proofing': 'Pest Control',
  'sanitisation': 'Sanitation',
  'sanitisation & specialist cleaning': 'Sanitation',
  'waste clearance': 'Waste Cleaners',
  'rubbish removal': 'Waste Cleaners',
  'gardening': 'Waste Cleaners',
};

function getEnvironmentalSubTrade(rawTrade: string): 'Pest Control' | 'Sanitation' | 'Waste Cleaners' | null {
  const check = (rawTrade || '').toLowerCase().trim();
  return SUB_TRADE_MAPPINGS[check] as any || null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CORE FIX: enrichRecord
   The backend now sends `trade` (mapped category) and `rawTrade` (original SF)
   on every record directly from the allocation. We just use them — no lookup.
   ───────────────────────────────────────────────────────────────────────────── */
function getLeeSubGroup(trade: string, rawTrade: string): 'Roofing' | 'Environmental Services' | 'Multi' | 'Decoration' | null {
  const isBF  = trade === 'Building Fabric';
  const isEnv = trade === 'Environmental Services';
  if (!isBF && !isEnv) return null;

  const check = (rawTrade || trade).toLowerCase().trim();
  if (check.includes('roofing'))            return 'Roofing';
  if (check.includes('decoration') || check.includes('decorating')) return 'Decoration';
  if (isEnv || ENV_RAW_TRADES_LC.has(check)) return 'Environmental Services';
  if (isBF)                                  return 'Multi';
  return null;
}

function enrichRecord(record: VCRRecord): VCRRecord & { tradeGroup: string; displayGroup: string } {
  // trade already IS the mapped category (e.g. "Building Fabric") — use directly
  const tradeGroup   = record.trade || 'N/A';
  const sub          = getLeeSubGroup(tradeGroup, record.rawTrade || '');
  const displayGroup = sub ?? tradeGroup;
  return { ...record, tradeGroup, displayGroup };
}

/* ── KPI Card ── */
interface KPICardProps {
  label: string; value: number; subtext: string;
  icon: React.ReactNode; color: "blue" | "green" | "orange" | "red";
  onClick?: () => void;
}
const KPICard: React.FC<KPICardProps> = ({ label, value, subtext, icon, color, onClick }) => {
  const colorMap = {
    blue:   { bg: C.surface.primarySubtle, text: C.primary.default, border: C.border.primary },
    green:  { bg: C.surface.successSubtle, text: C.success.default, border: "#A8D5BA" },
    orange: { bg: C.surface.warningSubtle, text: C.warning.default, border: C.border.warning },
    red:    { bg: C.surface.errorSubtle,   text: C.error.default,   border: C.border.error },
  };
  const colors = colorMap[color];
  return (
    <div
      onClick={onClick}
      style={{ padding: "24px", borderRadius: "12px", border: `2px solid ${colors.border}`, background: colors.bg, flex: 1, minWidth: "200px", cursor: onClick ? "pointer" : "default", transition: onClick ? "transform 0.2s, box-shadow 0.2s" : "none" }}
      onMouseEnter={(e) => { if (onClick) { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; } }}
      onMouseLeave={(e) => { if (onClick) { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; } }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, color: C.gray.subtle, margin: 0 }}>{label}</h3>
        <div style={{ fontSize: "20px", opacity: 0.8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: "32px", fontWeight: 700, color: colors.text, marginBottom: "4px" }}>{value.toLocaleString()}</div>
      <p style={{ fontSize: "12px", color: C.gray.caption, margin: 0 }}>{subtext}</p>
    </div>
  );
};

/* ── Table ── */
interface TableColumn { key: string; label: string; width?: string; sortable?: boolean; }
interface TableProps {
  title: string;
  data: (VCRRecord & { tradeGroup?: string; displayGroup?: string })[];
  columns: TableColumn[];
  emptyMessage: string;
  onEngineerClick?: (vanName: string) => void;
  sortKey?: string; sortOrder?: 'asc' | 'desc'; onSort?: (key: string) => void;
}

const Table: React.FC<TableProps> = ({ title, data, columns, emptyMessage, onEngineerClick, sortKey, sortOrder, onSort }) => {
  const statusColor = (s: string) => {
    if (s === "Submitted") return { bg: C.surface.successSubtle, color: C.success.default };
    if (s === "Overdue")   return { bg: C.surface.warningSubtle, color: C.warning.default };
    return                        { bg: C.surface.errorSubtle,   color: C.error.default };
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as any)[sortKey], bv = (b as any)[sortKey];
    if (av == null && bv != null) return sortOrder === 'asc' ? -1 : 1;
    if (av != null && bv == null) return sortOrder === 'asc' ? 1 : -1;
    if (av == null && bv == null) return 0;
    if (typeof av === 'number' && typeof bv === 'number') return sortOrder === 'asc' ? av - bv : bv - av;
    return sortOrder === 'asc'
      ? String(av).toLowerCase().localeCompare(String(bv).toLowerCase())
      : String(bv).toLowerCase().localeCompare(String(av).toLowerCase());
  });

  return (
    <div style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.text.title, marginBottom: "16px" }}>{title}</h2>
      <p style={{ fontSize: "12px", color: C.gray.caption, marginBottom: "12px" }}>{data.length} engineer{data.length !== 1 ? "s" : ""}</p>
      <div style={{ overflowX: "auto", borderRadius: "10px", border: `1px solid ${C.border.subtle}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "13px", background: "#FFFFFF" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border.subtle}`, background: C.gray.negative }}>
              {columns.map((col) => (
                <th key={col.key} onClick={() => col.sortable && onSort?.(col.key)}
                  style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: C.text.body, width: col.width, cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none', background: sortKey === col.key ? `${C.primary.default}10` : 'inherit', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { if (col.sortable) (e.currentTarget as HTMLElement).style.background = `${C.primary.default}15`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = sortKey === col.key ? `${C.primary.default}10` : 'inherit'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: C.primary.default }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: "60px 16px", textAlign: "center", color: C.gray.caption, fontSize: "14px", fontWeight: 500 }}>{emptyMessage}</td></tr>
            ) : sorted.map((row, idx) => (
              <tr key={idx}
                style={{ borderBottom: `1px solid ${C.border.subtle}`, transition: "background 0.2s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.gray.negative)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#FFFFFF")}
              >
                {columns.map((col) => {
                  let content: React.ReactNode = (row as any)[col.key];

                  if (col.key === "engineerName" && onEngineerClick) {
                    content = (
                      <span role="button" tabIndex={0}
                        onClick={() => onEngineerClick(row.vanName)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEngineerClick(row.vanName); }}
                        style={{ color: C.primary.default, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                      >{content}</span>
                    );
                  }
                  if (col.key === "status") {
                    const sc = statusColor(content as string);
                    content = <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", background: sc.bg, color: sc.color, fontSize: "12px", fontWeight: 600 }}>{content}</span>;
                  }
                  if (col.key === "daysSince" && content != null) {
                    content = <span style={{ fontWeight: 600, color: (content as number) > 14 ? C.error.default : C.success.default }}>{`${content} days`}</span>;
                  }
                  if (col.key === "latestVcrDate") content = content || "No VCR Report";
                  if (col.key === "vanName")       content = content || "N/A";

                  return <td key={col.key} style={{ padding: "12px 16px", color: C.text.body, width: col.width, wordBreak: "break-word" }}>{content}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Lightbox ── */
const Lightbox: React.FC<{ image: string | null; title: string; onClose: () => void }> = ({ image, title, onClose }) => {
  if (!image) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,29,35,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", backdropFilter: "blur(8px)" }}>
      <div style={{ textAlign: "center", maxWidth: "90vw" }}>
        <img src={image} alt={title} style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: "10px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} />
        <p style={{ color: "#FFFFFF", marginTop: "14px", fontFamily: FONT, fontSize: "13px", fontWeight: 500 }}>{title}</p>
      </div>
    </div>
  );
};

/* ── List Modal ── */
interface ListModalProps {
  isOpen: boolean; title: string;
  data: (VCRRecord & { tradeGroup?: string; displayGroup?: string })[];
  columns: TableColumn[]; onClose: () => void; color: "blue" | "green" | "orange" | "red";
}
const ListModal: React.FC<ListModalProps> = ({ isOpen, title, data, columns, onClose, color }) => {
  if (!isOpen) return null;
  const titleColor = color === "green" ? C.success.default : color === "red" ? C.error.default : C.warning.default;
  const statusColor = (s: string) => {
    if (s === "Submitted") return { bg: C.surface.successSubtle, color: C.success.default };
    if (s === "Overdue")   return { bg: C.surface.warningSubtle, color: C.warning.default };
    return                        { bg: C.surface.errorSubtle,   color: C.error.default };
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(26,29,35,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: "12px", maxWidth: "90vw", maxHeight: "85vh", width: "1000px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border.subtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: titleColor, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: C.gray.subtle }}>✕</button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "24px 28px" }}>
          <p style={{ fontSize: "12px", color: C.gray.caption, marginBottom: "16px" }}>{data.length} engineer{data.length !== 1 ? "s" : ""}</p>
          <div style={{ overflowX: "auto", borderRadius: "10px", border: `1px solid ${C.border.subtle}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "13px", background: "#FFFFFF" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border.subtle}`, background: C.gray.negative }}>
                  {columns.map((col) => (
                    <th key={col.key} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: C.text.body, width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0
                  ? <tr><td colSpan={columns.length} style={{ padding: "40px 16px", textAlign: "center", color: C.gray.caption }}>No engineers found</td></tr>
                  : data.map((row, idx) => (
                    <tr key={idx}
                      style={{ borderBottom: `1px solid ${C.border.subtle}`, transition: "background 0.2s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.gray.negative)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#FFFFFF")}
                    >
                      {columns.map((col) => {
                        let content: React.ReactNode = (row as any)[col.key];
                        if (col.key === "status") {
                          const sc = statusColor(content as string);
                          content = <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", background: sc.bg, color: sc.color, fontSize: "12px", fontWeight: 600 }}>{content}</span>;
                        }
                        if (col.key === "daysSince" && content != null) {
                          content = <span style={{ fontWeight: 600, color: (content as number) > 14 ? C.error.default : C.success.default }}>{`${content} days`}</span>;
                        }
                        if (col.key === "latestVcrDate") content = content || "No VCR Report";
                        if (col.key === "vanName")       content = content || "N/A";
                        return <td key={col.key} style={{ padding: "12px 16px", color: C.text.body, width: col.width, wordBreak: "break-word" }}>{content}</td>;
                      })}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const VehicleConditionDashboard: React.FC = () => {
  const [dashboard,        setDashboard]        = useState<DashboardData | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [searchResult,     setSearchResult]     = useState<SearchResult | null>(null);
  const [searchLoading,    setSearchLoading]    = useState(false);
  const [searchError,      setSearchError]      = useState("");
  const [lightboxImage,    setLightboxImage]    = useState<string | null>(null);
  const [lightboxTitle,    setLightboxTitle]    = useState("");
  const [modalOpen,        setModalOpen]        = useState<"submitted" | "notSubmitted" | null>(null);
  const [filterMode,       setFilterMode]       = useState<'today' | 'yesterday' | '7days' | null>(null);
  const [filterDate,       setFilterDate]       = useState<string>("");
  const [tradeGroupFilter, setTradeGroupFilter] = useState<string>("");
  const [leeSubFilter,     setLeeSubFilter]     = useState<'Multi' | 'Environmental Services' | 'Roofing' | 'Decoration' | null>(null);
  const [envSubFilter,     setEnvSubFilter]     = useState<'Pest Control' | 'Sanitation' | 'Waste Cleaners' | null>(null);
  const [vcrPopup,         setVcrPopup]         = useState<{ result: SearchResult | null; loading: boolean; open: boolean }>({ result: null, loading: false, open: false });
  const [aiAnalysis,       setAiAnalysis]       = useState<AIAnalysisResult | null>(null);
  const [aiLoading,        setAiLoading]        = useState(false);
  const [aiError,          setAiError]          = useState("");
  const [aiAnalysisFilter, setAiAnalysisFilter] = useState<"all" | "red" | "amber" | "green">("all");
  const [submittedSort,    setSubmittedSort]    = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'latestVcrDate', order: 'desc' });
  const [notSubmittedSort, setNotSubmittedSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'vanName', order: 'asc' });

  const { userTrade, showsAllTrades } = useUserTrade();

  useEffect(() => {
    if (userTrade && userTrade !== 'ALL') setTradeGroupFilter(userTrade);
    loadDashboard();
  }, [userTrade]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE}/compliance/dashboard/all-allocated`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDashboard(await res.json());
    } catch (e: any) {
      console.error(e.name === 'AbortError' ? "Timeout" : e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    try {
      setSearchLoading(true); setSearchError("");
      const res = await fetch(`${API_BASE}/compliance/search/${encodeURIComponent(term)}`);
      if (!res.ok) { setSearchError(res.status === 404 ? "Vehicle not found" : "Search failed"); return; }
      setSearchResult(await res.json());
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally { setSearchLoading(false); }
  };

  const fetchAiAnalysis = async (formId: string) => {
    setAiAnalysis(null); setAiError(""); setAiLoading(true); setAiAnalysisFilter("all");
    try {
      const res = await fetch(`${API_BASE}/ai-analyse/${formId}`);
      if (!res.ok) throw new Error(`AI analysis failed: ${res.status}`);
      setAiAnalysis(await res.json());
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI analysis failed");
    } finally { setAiLoading(false); }
  };

  const fetchVcrForVehicle = async (vanName: string) => {
    if (!vanName || vanName === "N/A") return;
    setAiAnalysis(null); setAiError(""); setAiLoading(false); setAiAnalysisFilter("all");
    setVcrPopup({ result: null, loading: true, open: true });
    try {
      const res = await fetch(`${API_BASE}/compliance/search/${encodeURIComponent(vanName)}`);
      if (!res.ok) throw new Error("Not found");
      setVcrPopup({ result: await res.json(), loading: false, open: true });
    } catch {
      setVcrPopup({ result: null, loading: false, open: false });
    }
  };

  /* ── Date helpers ── */
  const toDateStr   = (d: Date) => d.toISOString().split('T')[0];
  const todayStr    = toDateStr(new Date());
  const ydDate      = new Date(); ydDate.setDate(ydDate.getDate() - 1);
  const yesterdayStr = toDateStr(ydDate);
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0);

  /* ── User / permissions ── */
  const userEmail = (() => { try { return (JSON.parse(sessionStorage.getItem('user_data') || '{}').email || '').toLowerCase().trim(); } catch { return ''; } })();
  const userAllowedTrades     = userEmail ? (RESTRICTED_USERS[userEmail] || null) : null;
  const userAllowedCategories = userAllowedTrades
    ? [...new Set(userAllowedTrades.map((t: string) => {
        // map raw trade to category directly
        const entry = Object.entries(RESTRICTED_USERS).find(([k]) => k === userEmail);
        return t;
      }))].filter(Boolean)
    : null;

  const isLeeView = !!userAllowedCategories &&
    userAllowedCategories.some((c: string) => c === 'Building Fabric' || c.includes('Building')) &&
    userAllowedCategories.some((c: string) => c === 'Environmental Services' || c.includes('Environmental'));

  /* ── Enrich all records — now trivial because backend sends trade + rawTrade ── */
  const allSubmitted    = (dashboard?.submitted    || []).map(enrichRecord).filter(v => !isExcludedTrade(v.trade));
  const allNotSubmitted = (dashboard?.notSubmitted || []).map(enrichRecord).filter(v => !isExcludedTrade(v.trade));

  const actualTradeFilter = !showsAllTrades() ? userTrade : tradeGroupFilter;

  /* ── Trade filter predicate ── */
  const matchesTrade = (v: ReturnType<typeof enrichRecord>): boolean => {
    if (isLeeView || actualTradeFilter === 'Building Fabric & Environmental') {
      const sub = getLeeSubGroup(v.tradeGroup || '', v.rawTrade || '');
      if (sub === null)  return false;
      if (!leeSubFilter) return true;
      
      // If Environmental Services is selected, check environmental sub-filter
      if (leeSubFilter === 'Environmental Services' && envSubFilter) {
        const envSub = getEnvironmentalSubTrade(v.rawTrade || '');
        return envSub === envSubFilter;
      }
      
      return sub === leeSubFilter;
    }
    return !actualTradeFilter || v.tradeGroup === actualTradeFilter;
  };

  /* ── Date filter (submitted only) ── */
  const dateFilter = (v: ReturnType<typeof enrichRecord>) => {
    if (filterDate)               return v.latestVcrDate === filterDate;
    if (!filterMode)              return true;
    if (!v.latestVcrDate)         return false;
    if (filterMode === 'today')     return v.latestVcrDate === todayStr;
    if (filterMode === 'yesterday') return v.latestVcrDate === yesterdayStr;
    if (filterMode === '7days')     return new Date(v.latestVcrDate) >= sevenDaysAgo;
    return true;
  };

  const filteredSubmitted    = allSubmitted.filter(dateFilter).filter(matchesTrade);
  const filteredNotSubmitted = allNotSubmitted.filter(matchesTrade);

  const isFiltered = !!(filterMode || filterDate || actualTradeFilter || leeSubFilter);
  const totalForUser = (isLeeView || actualTradeFilter || !showsAllTrades())
    ? new Set([...filteredSubmitted, ...filteredNotSubmitted].map(v => v.engineerName)).size
    : new Set([...allSubmitted, ...allNotSubmitted].map(v => v.engineerName)).size;

  const submittedSubtext =
    filterDate        ? `Submitted on ${filterDate}` :
    filterMode === 'today'     ? 'Submitted today' :
    filterMode === 'yesterday' ? 'Submitted yesterday' :
    filterMode === '7days'     ? 'In last 7 days' : 'Within 14 days';

  const notSubmittedSubtext =
    filterDate        ? `Not submitted on ${filterDate}` :
    filterMode === 'today'     ? 'Not submitted today' :
    filterMode === 'yesterday' ? 'Not submitted yesterday' :
    filterMode === '7days'     ? 'Not submitted in 7 days' : 'Overdue or never submitted';

  const submittedColumns: TableColumn[] = [
    { key: "vanName",       label: "Van Number",  width: "12%", sortable: true },
    { key: "engineerName",  label: "Engineer",    width: "20%", sortable: true },
    { key: "displayGroup",  label: "Trade Group", width: "18%", sortable: true },
    { key: "latestVcrDate", label: "Last Report", width: "15%", sortable: true },
    { key: "daysSince",     label: "Days Since",  width: "12%", sortable: true },
    { key: "status",        label: "Status",      width: "10%", sortable: true },
  ];
  const notSubmittedColumns: TableColumn[] = [
    { key: "vanName",       label: "Van Number",   width: "12%", sortable: true },
    { key: "engineerName",  label: "Engineer",     width: "20%", sortable: true },
    { key: "displayGroup",  label: "Trade Group",  width: "18%", sortable: true },
    { key: "latestVcrDate", label: "Last Report",  width: "15%", sortable: true },
    { key: "daysSince",     label: "Days Overdue", width: "12%", sortable: true },
    { key: "status",        label: "Status",       width: "10%", sortable: true },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `3px solid ${C.border.subtle}`, borderTop: `3px solid ${C.brand.blue}`, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: C.gray.subtle, fontWeight: 600 }}>Loading VCR Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, background: C.gray.surface, minHeight: "100vh", paddingBottom: "40px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ backgroundImage: "url('/London_Skyliner.png')", backgroundSize: "cover", backgroundPosition: "center", borderBottom: `1px solid ${C.border.subtle}`, padding: "40px 20px", marginBottom: "32px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(23,50,94,0.55)" }} />
        <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 8px 0" }}>Chumey Vehicle Condition Report</h1>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", margin: 0 }}>VCR Compliance Dashboard • As of {dashboard?.asOfDate}</p>
            </div>
            {(!showsAllTrades() || !!userAllowedCategories || isLeeView) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: `${C.warning.default}15`, border: `1.5px solid ${C.warning.default}`, whiteSpace: 'nowrap' }}>
                <Lock style={{ width: 16, height: 16, color: C.warning.default }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.warning.default }}>
                  Viewing {isLeeView ? (leeSubFilter ? `Lee's ${leeSubFilter}` : "Lee's Portfolio") : userAllowedCategories ? (userAllowedCategories as string[]).join(' & ') : userTrade} only
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>

        {/* ── Search ── */}
        <div style={{ marginBottom: "32px" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", background: "#FFFFFF", padding: "20px", borderRadius: "12px", border: `1px solid ${C.border.subtle}` }}>
            <input type="text" placeholder="Search by vehicle number, registration, or van number"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "12px 16px", borderRadius: "8px", border: `1px solid ${C.border.subtle}`, fontSize: "14px", fontFamily: FONT, outline: "none" }}
              onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = C.primary.default)}
              onBlur={(e)  => ((e.target as HTMLInputElement).style.borderColor = C.border.subtle)}
            />
            <button type="submit" disabled={searchLoading}
              style={{ padding: "12px 28px", borderRadius: "8px", border: "none", background: C.brand.yellow, color: "#000", fontWeight: 700, fontSize: "14px", fontFamily: FONT, cursor: searchLoading ? "not-allowed" : "pointer", opacity: searchLoading ? 0.6 : 1 }}
            >{searchLoading ? "Searching..." : "Search"}</button>
          </form>

          {searchError && (
            <div style={{ marginTop: "12px", padding: "12px 16px", background: C.surface.errorSubtle, border: `1px solid ${C.border.error}`, borderRadius: "8px", color: C.error.default, fontSize: "13px", fontWeight: 500 }}>{searchError}</div>
          )}

          {searchResult && (
            <div style={{ marginTop: "20px", padding: "20px", background: "#FFFFFF", borderRadius: "12px", border: `1px solid ${C.border.subtle}` }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: C.text.title, marginBottom: "16px" }}>{searchResult.vehicle}</h3>
              {searchResult.latestVcr ? (
                <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${C.border.subtle}` }}>
                  <p style={{ fontSize: "13px", color: C.gray.subtle, margin: "0 0 8px 0" }}>Latest Report</p>
                  <p style={{ fontSize: "14px", color: C.text.body, fontWeight: 600, margin: "0 0 4px 0" }}>{searchResult.latestVcr.name}</p>
                  <p style={{ fontSize: "12px", color: C.gray.caption, margin: 0 }}>{searchResult.latestVcr.engineer} • {searchResult.latestVcr.createdDate}</p>
                </div>
              ) : <p style={{ fontSize: "13px", color: C.gray.caption, marginBottom: "16px" }}>No VCR report found</p>}
              {searchResult.images.length > 0 ? (
                <div>
                  <p style={{ fontSize: "13px", color: C.gray.subtle, margin: "0 0 12px 0", fontWeight: 600 }}>Attached Images ({searchResult.images.length})</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
                    {searchResult.images.map((img) => (
                      <div key={img.id} role="button" tabIndex={0}
                        onClick={() => { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); } }}
                        style={{ cursor: "pointer", borderRadius: "8px", overflow: "hidden", border: `1px solid ${C.border.subtle}`, aspectRatio: "1", background: C.gray.negative }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                      >
                        <img src={img.imageUrl} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ fontSize: "13px", color: C.gray.caption }}>No images attached</p>}
            </div>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "40px", flexWrap: "wrap" }}>
          <KPICard label="Total Active Engineers" value={totalForUser}
            subtext={isLeeView ? (leeSubFilter ? `${leeSubFilter} only` : "Lee's Portfolio") : !showsAllTrades() ? `${userTrade} only` : "Currently allocated"}
            color="blue" icon="" />
          <KPICard label="SUBMITTED" value={filteredSubmitted.length} subtext={submittedSubtext} color="green" icon="✓" onClick={() => setModalOpen("submitted")} />
          <KPICard label="NOT SUBMITTED" value={filteredNotSubmitted.length} subtext={notSubmittedSubtext} color="red" icon="✗" onClick={() => setModalOpen("notSubmitted")} />
        </div>

        {/* ── Filter Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", background: "#FFFFFF", padding: "16px 20px", borderRadius: "12px", border: `1px solid ${C.border.subtle}`, flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: C.gray.subtle, whiteSpace: "nowrap" }}>Filter by Date</span>
          {([{ key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: '7days', label: 'Last 7 Days' }] as const).map(({ key, label }) => {
            const active = filterMode === key && !filterDate;
            return (
              <button key={key} onClick={() => { setFilterDate(""); setFilterMode(active ? null : key); }}
                style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${active ? C.primary.default : C.border.subtle}`, background: active ? C.primary.default : C.gray.negative, color: active ? "#FFFFFF" : C.gray.subtle, fontSize: "13px", fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}
              >{label}</button>
            );
          })}
          <span style={{ color: C.gray.disabled }}>|</span>
          <input type="date" value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setFilterMode(null); }}
            style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${filterDate ? C.primary.default : C.border.subtle}`, fontSize: "13px", fontFamily: FONT, outline: "none", color: C.text.body }}
          />
          <span style={{ color: C.gray.disabled }}>|</span>

          {/* Lee sub-filter buttons */}
          {(isLeeView || actualTradeFilter === 'Building Fabric & Environmental') && (
            <>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.gray.subtle, whiteSpace: "nowrap" }}>View</span>
              {(['Multi', 'Roofing', 'Decoration', 'Environmental Services'] as const).map((group) => {
                const active = leeSubFilter === group;
                return (
                  <button key={group} onClick={() => { setLeeSubFilter(active ? null : group); if (group !== 'Environmental Services') setEnvSubFilter(null); }}
                    style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${active ? C.primary.default : C.border.subtle}`, background: active ? C.primary.default : C.gray.negative, color: active ? "#FFFFFF" : C.gray.subtle, fontSize: "13px", fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}
                  >{group}</button>
                );
              })}
            </>
          )}

          {/* Environmental Services sub-trade filters */}
          {(isLeeView || actualTradeFilter === 'Building Fabric & Environmental') && leeSubFilter === 'Environmental Services' && (
            <>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.gray.subtle, whiteSpace: "nowrap" }}>Sub-Trade</span>
              {(['Pest Control', 'Sanitation', 'Waste Cleaners'] as const).map((subTrade) => {
                const active = envSubFilter === subTrade;
                return (
                  <button key={subTrade} onClick={() => setEnvSubFilter(active ? null : subTrade)}
                    style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${active ? C.warning.default : C.border.subtle}`, background: active ? C.warning.default : C.gray.negative, color: active ? "#FFFFFF" : C.gray.subtle, fontSize: "13px", fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}
                  >{subTrade}</button>
                );
              })}
            </>
          )}

          {/* Trade group dropdown for admin */}
          {!isLeeView && showsAllTrades() && (
            <>
              <span style={{ fontSize: "13px", fontWeight: 700, color: C.gray.subtle, whiteSpace: "nowrap" }}>Trade Group</span>
              <select value={tradeGroupFilter}
                onChange={(e) => { setTradeGroupFilter(e.target.value); if (e.target.value !== 'Building Fabric & Environmental') setLeeSubFilter(null); }}
                style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${tradeGroupFilter ? C.primary.default : C.border.subtle}`, fontSize: "13px", fontFamily: FONT, outline: "none", color: tradeGroupFilter ? C.primary.default : C.gray.subtle, fontWeight: tradeGroupFilter ? 700 : 400, background: tradeGroupFilter ? C.surface.primarySubtle : C.gray.negative, cursor: "pointer", minWidth: "160px" }}
              >
                <option value="">All Trade Groups</option>
                {getAllTradeGroups().map((tg) => <option key={tg} value={tg}>{tg}</option>)}
              </select>
            </>
          )}

          {(filterMode || filterDate || leeSubFilter || envSubFilter) && (
            <button onClick={() => { setFilterMode(null); setFilterDate(""); setTradeGroupFilter(""); setLeeSubFilter(null); setEnvSubFilter(null); }}
              style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${C.border.subtle}`, background: C.gray.negative, fontSize: "12px", fontWeight: 600, color: C.gray.subtle, cursor: "pointer", fontFamily: FONT }}
            >Clear ✕</button>
          )}
          {(isFiltered || actualTradeFilter) && (
            <span style={{ fontSize: "12px", color: C.gray.caption }}>
              {filteredSubmitted.length} submitted · {filteredNotSubmitted.length} not submitted
              {envSubFilter ? ` · ${envSubFilter}` : leeSubFilter ? ` · ${leeSubFilter}` : actualTradeFilter ? ` · ${actualTradeFilter}` : ""}
            </span>
          )}
        </div>

        {/* ── Tables ── */}
        <Table title="✓ SUBMITTED" data={filteredSubmitted} columns={submittedColumns}
          emptyMessage={filterDate ? `No VCRs submitted on ${filterDate}` : filterMode === 'today' ? "No VCRs submitted today" : filterMode === 'yesterday' ? "No VCRs submitted yesterday" : filterMode === '7days' ? "No VCRs in last 7 days" : "All engineers are compliant!"}
          onEngineerClick={fetchVcrForVehicle}
          sortKey={submittedSort.key} sortOrder={submittedSort.order}
          onSort={(k) => setSubmittedSort(p => ({ key: k, order: p.key === k && p.order === 'asc' ? 'desc' : 'asc' }))}
        />
        <Table title="✗ NOT SUBMITTED" data={filteredNotSubmitted} columns={notSubmittedColumns}
          emptyMessage="All engineers have submitted reports!"
          sortKey={notSubmittedSort.key} sortOrder={notSubmittedSort.order}
          onSort={(k) => setNotSubmittedSort(p => ({ key: k, order: p.key === k && p.order === 'asc' ? 'desc' : 'asc' }))}
        />
      </div>

      {/* ── VCR Popup ── */}
      {vcrPopup.open && (
        <div onClick={() => setVcrPopup(p => ({ ...p, open: false }))}
          style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(26,29,35,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#FFFFFF", borderRadius: "14px", width: "680px", maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: FONT }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border.subtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#FFFFFF", zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: C.primary.default }}>VCR Report</h2>
              <button onClick={() => setVcrPopup(p => ({ ...p, open: false }))} style={{ border: "none", background: "none", fontSize: "22px", cursor: "pointer", color: C.gray.subtle }}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              {vcrPopup.loading ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `3px solid ${C.border.subtle}`, borderTop: `3px solid ${C.brand.blue}`, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <p style={{ color: C.gray.subtle, fontWeight: 600 }}>Loading VCR...</p>
                </div>
              ) : vcrPopup.result ? (
                <>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: C.text.title, marginBottom: "16px" }}>{vcrPopup.result.vehicle}</h3>
                  {vcrPopup.result.latestVcr ? (
                    <div style={{ padding: "14px 16px", borderRadius: "10px", background: C.surface.successSubtle, border: `1px solid ${C.border.primary}`, marginBottom: "20px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: C.success.default, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Latest Report</p>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: C.text.title, margin: "0 0 4px 0" }}>{vcrPopup.result.latestVcr.name}</p>
                      <p style={{ fontSize: "13px", color: C.gray.subtle, margin: 0 }}>{vcrPopup.result.latestVcr.engineer} • {vcrPopup.result.latestVcr.createdDate}</p>
                      {vcrPopup.result.latestVcr.description && <p style={{ fontSize: "13px", color: C.text.body, marginTop: "8px", marginBottom: 0 }}>{vcrPopup.result.latestVcr.description}</p>}
                    </div>
                  ) : <p style={{ fontSize: "13px", color: C.gray.caption, marginBottom: "16px" }}>No VCR report found</p>}

                  {vcrPopup.result.images.length > 0 ? (
                    <>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: C.gray.subtle, marginBottom: "12px" }}>Attached Images ({vcrPopup.result.images.length})</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                        {vcrPopup.result.images.map((img) => (
                          <div key={img.id} role="button" tabIndex={0}
                            onClick={() => { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); } }}
                            style={{ cursor: "pointer", borderRadius: "8px", overflow: "hidden", border: `1px solid ${C.border.subtle}`, aspectRatio: "1", background: C.gray.negative }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                          >
                            <img src={img.imageUrl} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p style={{ fontSize: "13px", color: C.gray.caption }}>No images attached</p>}

                  {/* AI Analysis */}
                  {vcrPopup.result.latestVcr && vcrPopup.result.images.length > 0 && (
                    <div style={{ marginTop: "24px", borderTop: `1px solid ${C.border.subtle}`, paddingTop: "20px" }}>
                      {!aiAnalysis && !aiLoading && (
                        <button onClick={() => fetchAiAnalysis(vcrPopup.result!.latestVcr!.id)}
                          style={{ width: "100%", padding: "14px", borderRadius: "10px", border: `2px solid ${C.primary.default}`, background: C.primary.default, color: "#FFFFFF", fontSize: "14px", fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primary.darker; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primary.default; }}
                        >🤖 Analyse Images with AI</button>
                      )}
                      {aiLoading && (
                        <div style={{ textAlign: "center", padding: "32px", background: C.surface.primarySubtle, borderRadius: "10px", border: `1px solid ${C.border.primary}` }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `3px solid ${C.border.subtle}`, borderTop: `3px solid ${C.primary.default}`, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                          <p style={{ color: C.primary.default, fontWeight: 700, margin: "0 0 4px 0" }}>AI is analysing vehicle images...</p>
                          <p style={{ color: C.gray.caption, fontSize: "12px", margin: 0 }}>This may take 10–30 seconds</p>
                        </div>
                      )}
                      {aiError && <div style={{ padding: "14px 16px", background: C.surface.errorSubtle, border: `1px solid ${C.border.error}`, borderRadius: "10px", color: C.error.default, fontSize: "13px", fontWeight: 500 }}>⚠️ {aiError}</div>}
                      {aiAnalysis && (
                        <div>
                          <div style={{ padding: "14px 18px", borderRadius: "10px", marginBottom: "16px", background: aiAnalysis.overall_fleet_status === "GREEN" ? C.surface.successSubtle : aiAnalysis.overall_fleet_status === "RED" ? C.surface.errorSubtle : C.surface.warningSubtle, border: `1.5px solid ${aiAnalysis.overall_fleet_status === "GREEN" ? "#A8D5BA" : aiAnalysis.overall_fleet_status === "RED" ? C.border.error : C.border.warning}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                            <div>
                              <p style={{ margin: "0 0 2px 0", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: C.gray.subtle }}>AI Fleet Assessment</p>
                              <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: C.text.title }}>{aiAnalysis.engineer} · {aiAnalysis.vehicle} · {aiAnalysis.reg_no}</p>
                              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: C.gray.caption }}>Analysed {aiAnalysis.analysed_at} · {aiAnalysis.total_images} image{aiAnalysis.total_images !== 1 ? "s" : ""} reviewed</p>
                            </div>
                            <div style={{ padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "14px", whiteSpace: "nowrap", background: aiAnalysis.overall_fleet_status === "GREEN" ? C.success.default : aiAnalysis.overall_fleet_status === "RED" ? C.error.default : C.warning.default, color: "#FFFFFF" }}>
                              {aiAnalysis.overall_fleet_status === "GREEN" ? "✓ ALL CLEAR" : aiAnalysis.overall_fleet_status === "RED" ? "✗ ACTION NEEDED" : "⚠ MONITOR"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                            {(["all", "red", "amber", "green"] as const).map((f) => {
                              const labels = { all: `All (${aiAnalysis.reports.length})`, red: `✗ Action Needed (${aiAnalysis.reports.filter(r => r.overall_condition === "RED").length})`, amber: `⚠ Monitor (${aiAnalysis.reports.filter(r => r.overall_condition === "AMBER").length})`, green: `✓ Good (${aiAnalysis.reports.filter(r => r.overall_condition === "GREEN").length})` };
                              const activeBg = { all: C.primary.default, red: C.error.default, amber: C.warning.default, green: C.success.default };
                              const isActive = aiAnalysisFilter === f;
                              return <button key={f} onClick={() => setAiAnalysisFilter(f)} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: isActive ? activeBg[f] : C.gray.negative, color: isActive ? "#FFFFFF" : C.text.body, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{labels[f]}</button>;
                            })}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {aiAnalysis.reports.filter(r => aiAnalysisFilter === "all" || r.overall_condition === aiAnalysisFilter.toUpperCase()).map((report, idx) => {
                              const condColor = report.overall_condition === "GREEN" ? C.success.default : report.overall_condition === "RED" ? C.error.default : C.warning.default;
                              const condLabel = report.overall_condition === "GREEN" ? "✓ Good Condition" : report.overall_condition === "RED" ? "✗ Action Needed" : "⚠ Needs Monitoring";
                              const actionIsNone = !report.action_required || report.action_required === "None";
                              const tags = [
                                report.damage_detected ? { text: "Damage", color: C.error.default } : null,
                                report.cleanliness && report.cleanliness !== "Clean" ? { text: report.cleanliness, color: C.warning.default } : null,
                                report.tyres_visible && report.tyre_condition && !["Good","Not Visible"].includes(report.tyre_condition) ? { text: `Tyres: ${report.tyre_condition}`, color: C.warning.default } : null,
                                report.lights_condition === "Damaged" ? { text: "Lights Damaged", color: C.error.default } : null,
                              ].filter(Boolean) as { text: string; color: string }[];
                              const matchingImage = vcrPopup.result?.images?.find(img => img.title.includes(report.image_title) || report.image_title.includes(img.title));
                              return (
                                <div key={idx} style={{ borderRadius: "12px", background: "#FFFFFF", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", minHeight: "180px" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                                >
                                  {matchingImage && (
                                    <div role="button" tabIndex={0} onClick={() => { setLightboxImage(matchingImage.imageUrl); setLightboxTitle(report.image_title); }} style={{ width: "160px", minWidth: "160px", cursor: "pointer", overflow: "hidden" }}>
                                      <img src={matchingImage.imageUrl} alt={report.image_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                  )}
                                  <div style={{ width: "6px", flexShrink: 0, background: condColor }} />
                                  <div style={{ flex: 1, padding: "16px 18px" }}>
                                    <span style={{ padding: "5px 14px", borderRadius: "20px", background: condColor, color: "#FFF", fontSize: "12px", fontWeight: 700 }}>{condLabel}</span>
                                    <p style={{ margin: "10px 0", fontSize: "13px", color: C.text.body, lineHeight: 1.65 }}>{report.inspector_notes}</p>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.border.subtle}` }}>
                                      {tags.length > 0 ? tags.map((tag) => <span key={tag.text} style={{ padding: "3px 10px", borderRadius: "20px", background: `${tag.color}15`, color: tag.color, fontSize: "11px", fontWeight: 700, border: `1px solid ${tag.color}30` }}>{tag.text}</span>) : <span style={{ padding: "3px 10px", borderRadius: "20px", background: C.surface.successSubtle, color: C.success.default, fontSize: "11px", fontWeight: 700, border: "1px solid #A8D5BA" }}>No Issues Found</span>}
                                      <span style={{ marginLeft: "auto", padding: "3px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: actionIsNone ? C.surface.successSubtle : C.surface.errorSubtle, color: actionIsNone ? C.success.default : C.error.default, border: `1px solid ${actionIsNone ? "#A8D5BA" : C.border.error}` }}>{actionIsNone ? "✓ No Action Required" : `⚠ ${report.action_required}`}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <button onClick={() => { setAiAnalysis(null); setAiError(""); setAiAnalysisFilter("all"); }} style={{ marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${C.border.subtle}`, background: C.gray.negative, color: C.gray.subtle, fontSize: "12px", fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}>↺ Reset Analysis</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Lightbox image={lightboxImage} title={lightboxTitle} onClose={() => setLightboxImage(null)} />
      <ListModal isOpen={modalOpen === "submitted"}    title="✓ SUBMITTED"     data={filteredSubmitted}    columns={submittedColumns}    onClose={() => setModalOpen(null)} color="green" />
      <ListModal isOpen={modalOpen === "notSubmitted"} title="✗ NOT SUBMITTED" data={filteredNotSubmitted} columns={notSubmittedColumns} onClose={() => setModalOpen(null)} color="red" />
    </div>
  );
};

export default VehicleConditionDashboard;