import React, { useState, useEffect, useCallback } from "react";

/* ── Type Definitions ── */
interface SubmittedVCR {
  vehicleId: string;
  vanName: string;
  regNo: string;
  engineerName: string;
  latestVcrDate: string;
  daysSince: number;
  status: "Submitted";
}

interface NotSubmittedVCR {
  vehicleId: string;
  vanName: string;
  regNo: string;
  engineerName: string;
  latestVcrDate: string | null;
  daysSince: number | null;
  status: "Missing" | "Overdue";
}

interface DashboardData {
  totalAllocated: number;
  submittedCount: number;
  notSubmittedCount: number;
  submitted: SubmittedVCR[];
  notSubmitted: NotSubmittedVCR[];
  asOfDate: string;
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
  error: { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#FAEDEA" },
  warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FEF5EC" },
  success: { light: "#A8D5BA", default: "#40916C", darker: "#1B4B35", subtle: "#E8F5F1" },
  gray: {
    title: "#1A1D23",
    body: "#323843",
    subtle: "#646F86",
    caption: "#848EA3",
    negative: "#F3F4F6",
    disabled: "#CDD1DA",
    border: "#CDD1DA",
    borderSubtle: "#E8EAEE",
    surface: "#F3F4F6",
  },
  text: { title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3", disabled: "#CDD1DA", negative: "#F3F4F6" },
  border: { primary: "#DEE8F7", error: "#F6DBD5", warning: "#FCE9D4", default: "#CDD1DA", subtle: "#E8EAEE" },
  surface: { primarySubtle: "#F7F9FD", errorSubtle: "#FAEDEA", warningSubtle: "#FEF5EC", successSubtle: "#E8F5F1" },
} as const;

const FONT = "'Mont', 'Montserrat', sans-serif";

// ✅ FIX: Use deployed Cloud Run URL instead of localhost
// Detects environment automatically - uses relative path in production (same-origin)
// or falls back to the Cloud Run URL
const API_BASE = (() => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // If running on Cloud Run or any non-localhost host, use same origin
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.origin}/api/vehicle-condition`;
    }
  }
  // Local development fallback
  return "http://localhost:8000/api/vehicle-condition";
})();

/* ── KPI Card Component ── */
interface KPICardProps {
  label: string;
  value: number;
  subtext: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "orange" | "red";
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subtext, icon, color, onClick }) => {
  const colorMap = {
    blue: { bg: C.surface.primarySubtle, text: C.primary.default, border: C.border.primary },
    green: { bg: C.surface.successSubtle, text: C.success.default, border: "#A8D5BA" },
    orange: { bg: C.surface.warningSubtle, text: C.warning.default, border: C.border.warning },
    red: { bg: C.surface.errorSubtle, text: C.error.default, border: C.border.error },
  };

  const colors = colorMap[color];

  return (
    <div
      onClick={onClick}
      style={{
        padding: "24px",
        borderRadius: "12px",
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        flex: 1,
        minWidth: "200px",
        cursor: onClick ? "pointer" : "default",
        transition: onClick ? "transform 0.2s, box-shadow 0.2s" : "none",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }
      }}
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

/* ── Table Component ── */
interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

interface TableProps {
  title: string;
  data: SubmittedVCR[] | NotSubmittedVCR[];
  columns: TableColumn[];
  emptyMessage: string;
}

const Table: React.FC<TableProps> = ({ title, data, columns, emptyMessage }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return { bg: C.surface.successSubtle, color: C.success.default };
      case "Overdue":
        return { bg: C.surface.warningSubtle, color: C.warning.default };
      case "Missing":
        return { bg: C.surface.errorSubtle, color: C.error.default };
      default:
        return { bg: C.gray.negative, color: C.gray.body };
    }
  };

  return (
    <div style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.text.title, marginBottom: "16px" }}>{title}</h2>
      <p style={{ fontSize: "12px", color: C.gray.caption, marginBottom: "12px" }}>
        {data.length} vehicle{data.length !== 1 ? "s" : ""}
      </p>

      <div style={{ overflowX: "auto", borderRadius: "10px", border: `1px solid ${C.border.subtle}` }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: FONT,
            fontSize: "13px",
            background: "#FFFFFF",
          }}
        >
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border.subtle}`, background: C.gray.negative }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: C.text.body,
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "60px 16px",
                    textAlign: "center",
                    color: C.gray.caption,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: `1px solid ${C.border.subtle}`,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.gray.negative)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#FFFFFF")}
                >
                  {columns.map((col) => {
                    let content = row[col.key as keyof typeof row];

                    if (col.key === "status") {
                      const colors = getStatusColor(content as string);
                      content = (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: colors.bg,
                            color: colors.color,
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {content}
                        </span>
                      );
                    }

                    if (col.key === "daysSince" && content !== null && content !== undefined) {
                      content = (
                        <span style={{ fontWeight: 600, color: (content as number) > 14 ? C.error.default : C.success.default }}>
                          {content === null ? "No data" : `${content} days`}
                        </span>
                      );
                    }

                    if (col.key === "latestVcrDate") {
                      content = content || "No report";
                    }

                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: "12px 16px",
                          color: C.text.body,
                          width: col.width,
                          wordBreak: "break-word",
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Lightbox ── */
interface LightboxProps {
  image: string | null;
  title: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ image, title, onClose }) => {
  if (!image) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(26,29,35,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "90vw" }}>
        <img
          src={image}
          alt={title}
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            borderRadius: "10px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        />
        <p
          style={{
            color: "#FFFFFF",
            marginTop: "14px",
            fontFamily: FONT,
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {title}
        </p>
      </div>
    </div>
  );
};

/* ── Modal for Lists ── */
interface ListModalProps {
  isOpen: boolean;
  title: string;
  data: SubmittedVCR[] | NotSubmittedVCR[];
  columns: TableColumn[];
  onClose: () => void;
  color: "blue" | "green" | "orange" | "red";
}

const ListModal: React.FC<ListModalProps> = ({ isOpen, title, data, columns, onClose, color }) => {
  if (!isOpen) return null;

  const colorMap = {
    green: C.success.default,
    orange: C.warning.default,
    red: C.error.default,
  };

  const titleColor = colorMap[color as keyof typeof colorMap] || C.primary.default;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(26,29,35,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          maxWidth: "90vw",
          maxHeight: "85vh",
          width: "1000px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "24px 28px",
            borderBottom: `1px solid ${C.border.subtle}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: titleColor, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: C.gray.subtle,
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflow: "auto", flex: 1, padding: "24px 28px" }}>
          <p style={{ fontSize: "12px", color: C.gray.caption, marginBottom: "16px" }}>
            {data.length} vehicle{data.length !== 1 ? "s" : ""}
          </p>

          <div style={{ overflowX: "auto", borderRadius: "10px", border: `1px solid ${C.border.subtle}` }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: FONT,
                fontSize: "13px",
                background: "#FFFFFF",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border.subtle}`, background: C.gray.negative }}>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: C.text.body,
                        width: col.width,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        padding: "40px 16px",
                        textAlign: "center",
                        color: C.gray.caption,
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case "Submitted": return { bg: C.surface.successSubtle, color: C.success.default };
                        case "Overdue": return { bg: C.surface.warningSubtle, color: C.warning.default };
                        case "Missing": return { bg: C.surface.errorSubtle, color: C.error.default };
                        default: return { bg: C.gray.negative, color: C.gray.body };
                      }
                    };

                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: `1px solid ${C.border.subtle}`, transition: "background 0.2s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.gray.negative)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#FFFFFF")}
                      >
                        {columns.map((col) => {
                          let content = row[col.key as keyof typeof row];

                          if (col.key === "status") {
                            const colors = getStatusColor(content as string);
                            content = (
                              <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", background: colors.bg, color: colors.color, fontSize: "12px", fontWeight: 600 }}>
                                {content}
                              </span>
                            );
                          }

                          if (col.key === "daysSince" && content !== null && content !== undefined) {
                            content = (
                              <span style={{ fontWeight: 600, color: (content as number) > 14 ? C.error.default : C.success.default }}>
                                {`${content} days`}
                              </span>
                            );
                          }

                          if (col.key === "latestVcrDate") {
                            content = content || "No report";
                          }

                          return (
                            <td key={col.key} style={{ padding: "12px 16px", color: C.text.body, width: col.width, wordBreak: "break-word" }}>
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
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
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [modalOpen, setModalOpen] = useState<"submitted" | "overdue" | "missing" | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/compliance/dashboard/all-allocated`);
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error("Dashboard error:", e);
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    try {
      setSearchLoading(true);
      setSearchError("");
      setSearchResult(null);
      const res = await fetch(`${API_BASE}/compliance/search/${encodeURIComponent(term)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setSearchError("Vehicle not found");
        } else {
          throw new Error(`Search failed: ${res.status}`);
        }
      } else {
        const data = await res.json();
        // ✅ FIX: Rewrite imageUrl to use current origin instead of localhost
        if (data.images) {
          data.images = data.images.map((img: { imageUrl: string; [key: string]: unknown }) => ({
            ...img,
            imageUrl: img.imageUrl.replace("http://localhost:8000", window.location.origin),
          }));
        }
        setSearchResult(data);
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const overduCount = dashboard?.notSubmitted.filter((v) => v.status === "Overdue").length || 0;
  const missingCount = dashboard?.notSubmitted.filter((v) => v.status === "Missing").length || 0;

  const submittedColumns: TableColumn[] = [
    { key: "vanName", label: "Van Number", width: "15%" },
    { key: "engineerName", label: "Engineer", width: "20%" },
    { key: "latestVcrDate", label: "Last Report", width: "15%" },
    { key: "daysSince", label: "Days Since", width: "12%" },
    { key: "status", label: "Status", width: "12%" },
  ];

  const notSubmittedColumns: TableColumn[] = [
    { key: "vanName", label: "Van Number", width: "15%" },
    { key: "engineerName", label: "Engineer", width: "20%" },
    { key: "latestVcrDate", label: "Last Report", width: "15%" },
    { key: "daysSince", label: "Days Overdue", width: "12%" },
    { key: "status", label: "Status", width: "12%" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: `3px solid ${C.border.subtle}`,
              borderTop: `3px solid ${C.brand.blue}`,
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: C.gray.subtle, fontWeight: 600 }}>Loading VCR Dashboard...</p>
        </div>
      </div>
    );
  }

  // ✅ NEW: Error state UI instead of silent failure
  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: C.surface.errorSubtle,
            border: `2px solid ${C.border.error}`,
            borderRadius: "16px",
            maxWidth: "480px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ color: C.error.default, marginBottom: "12px", fontSize: "20px" }}>Failed to Load Dashboard</h2>
          <p style={{ color: C.text.subtle, fontSize: "14px", marginBottom: "24px" }}>{error}</p>
          <button
            onClick={loadDashboard}
            style={{
              padding: "12px 28px",
              borderRadius: "8px",
              border: "none",
              background: C.brand.blue,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "14px",
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, background: C.gray.surface, minHeight: "100vh", paddingBottom: "40px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${C.border.subtle}`, padding: "40px 20px", marginBottom: "32px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: C.text.title, margin: "0 0 8px 0" }}>
            14-Day Vehicle Condition Report
          </h1>
          <p style={{ fontSize: "14px", color: C.gray.caption, margin: 0 }}>
            VCR Compliance Dashboard • As of {dashboard?.asOfDate}
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>
        {/* Search Bar */}
        <div style={{ marginBottom: "32px" }}>
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "12px",
              background: "#FFFFFF",
              padding: "20px",
              borderRadius: "12px",
              border: `1px solid ${C.border.subtle}`,
            }}
          >
            <input
              type="text"
              placeholder="Search by vehicle number, registration, or van number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "8px",
                border: `1px solid ${C.border.subtle}`,
                fontSize: "14px",
                fontFamily: FONT,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = C.primary.default)}
              onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = C.border.subtle)}
            />
            <button
              type="submit"
              disabled={searchLoading}
              style={{
                padding: "12px 28px",
                borderRadius: "8px",
                border: "none",
                background: C.brand.yellow,
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                fontFamily: FONT,
                cursor: searchLoading ? "not-allowed" : "pointer",
                opacity: searchLoading ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                background: C.surface.errorSubtle,
                border: `1px solid ${C.border.error}`,
                borderRadius: "8px",
                color: C.error.default,
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {searchError}
            </div>
          )}

          {/* Search Results */}
          {searchResult && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                background: "#FFFFFF",
                borderRadius: "12px",
                border: `1px solid ${C.border.subtle}`,
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: C.text.title, marginBottom: "16px" }}>
                {searchResult.vehicle}
              </h3>

              {searchResult.latestVcr ? (
                <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${C.border.subtle}` }}>
                  <p style={{ fontSize: "13px", color: C.gray.subtle, margin: "0 0 8px 0" }}>Latest Report</p>
                  <p style={{ fontSize: "14px", color: C.text.body, fontWeight: 600, margin: "0 0 4px 0" }}>
                    {searchResult.latestVcr.name}
                  </p>
                  <p style={{ fontSize: "12px", color: C.gray.caption, margin: 0 }}>
                    {searchResult.latestVcr.engineer} • {searchResult.latestVcr.createdDate}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: C.gray.caption, marginBottom: "16px" }}>No VCR report found</p>
              )}

              {searchResult.images.length > 0 ? (
                <div>
                  <p style={{ fontSize: "13px", color: C.gray.subtle, margin: "0 0 12px 0", fontWeight: 600 }}>
                    Attached Images ({searchResult.images.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
                    {searchResult.images.map((img) => (
                      <div
                        key={img.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setLightboxImage(img.imageUrl); setLightboxTitle(img.title); } }}
                        style={{
                          cursor: "pointer",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: `1px solid ${C.border.subtle}`,
                          aspectRatio: "1",
                          background: C.gray.negative,
                          transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(39,84,157,0.12)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                      >
                        <img src={img.imageUrl} alt={img.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: C.gray.caption }}>No images attached</p>
              )}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "40px", flexWrap: "wrap" }}>
          <KPICard label="Total Allocated" value={dashboard?.totalAllocated || 0} subtext="Active Vehicles" color="blue" icon="🚐" />
          <KPICard label="SUBMITTED" value={dashboard?.submittedCount || 0} subtext="Within 14 days" color="green" icon="✓" onClick={() => setModalOpen("submitted")} />
          <KPICard label="OVERDUE" value={overduCount} subtext="Older than 14 days" color="orange" icon="⚠" onClick={() => setModalOpen("overdue")} />
          <KPICard label="MISSING" value={missingCount} subtext="Not Submitted in 14 Days" color="red" icon="✗" onClick={() => setModalOpen("missing")} />
        </div>

        {/* Tables */}
        <Table title="✓ SUBMITTED" data={dashboard?.submitted || []} columns={submittedColumns} emptyMessage="All vehicles are compliant!" />
        <Table title="✗ NOT SUBMITTED" data={dashboard?.notSubmitted || []} columns={notSubmittedColumns} emptyMessage="All vehicles have submitted reports!" />
      </div>

      {/* Lightbox */}
      <Lightbox image={lightboxImage} title={lightboxTitle} onClose={() => setLightboxImage(null)} />

      {/* Modals */}
      <ListModal isOpen={modalOpen === "submitted"} title="✓ SUBMITTED" data={dashboard?.submitted || []} columns={submittedColumns} onClose={() => setModalOpen(null)} color="green" />
      <ListModal isOpen={modalOpen === "overdue"} title="⚠ OVERDUE" data={dashboard?.notSubmitted.filter((v) => v.status === "Overdue") || []} columns={notSubmittedColumns} onClose={() => setModalOpen(null)} color="orange" />
      <ListModal isOpen={modalOpen === "missing"} title="✗ NOT SUBMITTED VCR" data={dashboard?.notSubmitted.filter((v) => v.status === "Missing") || []} columns={notSubmittedColumns} onClose={() => setModalOpen(null)} color="red" />
    </div>
  );
};

export default VehicleConditionDashboard;
