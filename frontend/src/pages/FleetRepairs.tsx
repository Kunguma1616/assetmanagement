import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Download, CheckCircle, AlertCircle, Clock } from "lucide-react";
import SectionHero from "@/components/layout/SectionHero";

/* ── Type Definitions ── */
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
  imageUrl?: string;
  error?: string;
}

interface FleetRepairItem {
  id: string;
  vehicle: string;
  reg_no: string;
  engineer: string;
  report: AIImageReport;
  analysed_at: string;
  status: "pending" | "in-progress" | "completed" | "on-hold";
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

const FONT = "'Mont', 'Montserrat', sans-serif";

/* ── Lightbox Component ── */
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

/* ── Priority Badge ── */
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: "#D15134", text: "#FFFFFF" },
    HIGH: { bg: "#F29630", text: "#FFFFFF" },
    MEDIUM: { bg: "#7099DB", text: "#FFFFFF" },
    LOW: { bg: "#40916C", text: "#FFFFFF" },
  };
  const color = colors[priority] || colors.LOW;
  return (
    <span style={{ padding: "4px 12px", borderRadius: "20px", background: color.bg, color: color.text, fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>
      {priority}
    </span>
  );
};

/* ── Status Badge ── */
const StatusBadge: React.FC<{ status: string; onChange?: (status: string) => void }> = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  
  const colors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: C.surface.warningSubtle, text: C.warning.default, icon: "" },
    "in-progress": { bg: C.surface.primarySubtle, text: C.primary.default, icon: "" },
    completed: { bg: C.surface.successSubtle, text: C.success.default, icon: "✓" },
    "on-hold": { bg: C.surface.errorSubtle, text: C.error.default, icon: "⏸" },
  };
  
  const color = colors[status] || colors.pending;
  
  if (!onChange) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", background: color.bg, color: color.text, fontSize: "12px", fontWeight: 600 }}>
        {color.icon} {status}
      </span>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", background: color.bg, color: color.text, fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" }}>
        {color.icon} {status}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#FFFFFF", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 100, marginTop: "8px", overflow: "hidden" }}>
          {["pending", "in-progress", "completed", "on-hold"].map((s) => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", border: "none", background: s === status ? C.primary.light : "transparent", color: C.text.body, fontSize: "13px", fontWeight: 600, cursor: "pointer", borderBottom: s !== "on-hold" ? `1px solid ${C.border.subtle}` : "none" }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ── */
const FleetRepairs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [items, setItems] = useState<FleetRepairItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FleetRepairItem[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "vehicle" | "date">("priority");

  useEffect(() => {
    // Get the action-needed items passed from previous page or from sessionStorage
    const state = location.state as { repairItems?: FleetRepairItem[] };
    
    if (state?.repairItems && state.repairItems.length > 0) {
      // New items from navigation - APPEND to existing items (don't replace)
      setItems((prevItems) => {
        // Combine items, avoiding duplicates by ID
        const existingIds = new Set(prevItems.map(item => item.id));
        const newItems = state.repairItems.filter(item => !existingIds.has(item.id));
        const combinedItems = [...prevItems, ...newItems];
        
        // Save merged list to sessionStorage
        sessionStorage.setItem("fleetRepairItems", JSON.stringify(combinedItems));
        return combinedItems;
      });
    } else {
      // Try to restore from sessionStorage if coming back from another page
      const savedItems = sessionStorage.getItem("fleetRepairItems");
      if (savedItems) {
        try {
          setItems(JSON.parse(savedItems));
        } catch (e) {
          console.error("Failed to parse saved repair items:", e);
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    let filtered = items;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.vehicle.toLowerCase().includes(term) ||
        item.reg_no.toLowerCase().includes(term) ||
        item.engineer.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (priorityOrder[a.report.priority as keyof typeof priorityOrder] ?? 4) - (priorityOrder[b.report.priority as keyof typeof priorityOrder] ?? 4);
      }
      if (sortBy === "vehicle") {
        return a.vehicle.localeCompare(b.vehicle);
      }
      if (sortBy === "date") {
        return new Date(b.analysed_at).getTime() - new Date(a.analysed_at).getTime();
      }
      return 0;
    });

    setFilteredItems(filtered);
  }, [items, searchTerm, sortBy]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.map((item) =>
        item.id === id ? { ...item, status: newStatus as "pending" | "in-progress" | "completed" | "on-hold" } : item
      );
      // Persist to sessionStorage
      sessionStorage.setItem("fleetRepairItems", JSON.stringify(updatedItems));
      return updatedItems;
    });
  };

  return (
    <div style={{ fontFamily: FONT, background: C.gray.surface, minHeight: "100vh", paddingBottom: "40px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <SectionHero
        title="Fleet Repairs Management"
        subtitle="Action-Required Items from AI Analysis"
        onBack={() => navigate(-1)}
      />

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>
        {/* ── Search & Filter Bar ── */}
        <div style={{ background: "#FFFFFF", borderRadius: "12px", border: `1px solid ${C.border.subtle}`, padding: "20px", marginBottom: "24px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Search by vehicle, registration, or engineer name" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: "250px", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${C.border.subtle}`, fontSize: "14px", fontFamily: FONT, outline: "none" }} onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = C.primary.default)} onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = C.border.subtle)} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ padding: "12px 16px", borderRadius: "8px", border: `1px solid ${C.border.subtle}`, fontSize: "14px", fontFamily: FONT, outline: "none", background: "#FFFFFF", cursor: "pointer" }}>
            <option value="priority">Sort by Priority</option>
            <option value="vehicle">Sort by Vehicle</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>

        {/* ── Repair Items Grid ── */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#FFFFFF", borderRadius: "12px", border: `1px solid ${C.border.subtle}` }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: C.gray.subtle, marginBottom: "8px" }}>No repairs found</p>
            <p style={{ fontSize: "14px", color: C.gray.caption }}>Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
            {filteredItems.map((item, idx) => (
              <div key={`${item.id}-${idx}`} style={{ borderRadius: "12px", background: "#FFFFFF", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: `1px solid ${C.border.subtle}`, transition: "all 0.3s", display: "flex", flexDirection: "column", height: "100%" }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                {/* Image Header */}
                <div style={{ width: "100%", height: "200px", background: C.gray.negative, position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => { if (item.report.imageUrl) { setLightboxImage(item.report.imageUrl); setLightboxTitle(item.report.image_title); } }}>
                  {item.report.imageUrl ? (
                    <img src={item.report.imageUrl} alt={item.report.image_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.gray.subtle }}>No Image</div>
                  )}
                  {/* Condition indicator bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: item.report.overall_condition === "RED" ? C.error.default : item.report.overall_condition === "AMBER" ? C.warning.default : C.success.default }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Vehicle Info */}
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: C.text.title, margin: "0 0 4px 0" }}>{item.vehicle}</h3>
                    <p style={{ fontSize: "12px", color: C.gray.caption, margin: 0 }}>
                      {item.reg_no} • {item.engineer}
                    </p>
                  </div>

                  {/* Area & Issue */}
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: C.gray.subtle, margin: "0 0 4px 0" }}>{item.report.area_captured}</p>
                    <p style={{ fontSize: "13px", color: C.text.body, lineHeight: 1.5, margin: 0 }}>{item.report.inspector_notes}</p>
                  </div>

                  {/* Damage Description */}
                  {item.report.damage_detected && item.report.damage_description && (
                    <div style={{ padding: "10px 12px", background: C.surface.errorSubtle, borderRadius: "8px", border: `1px solid ${C.border.error}` }}>
                      <p style={{ fontSize: "12px", color: C.error.default, fontWeight: 600, margin: "0 0 4px 0" }}>Damage Detected:</p>
                      <p style={{ fontSize: "12px", color: C.error.default, margin: 0 }}>{item.report.damage_description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <PriorityBadge priority={item.report.priority} />
                    {item.report.cleanliness && item.report.cleanliness !== "Clean" && (
                      <span style={{ padding: "4px 10px", borderRadius: "20px", background: C.surface.warningSubtle, color: C.warning.default, fontSize: "11px", fontWeight: 600 }}>
                        {item.report.cleanliness}
                      </span>
                    )}
                    {item.report.tyres_visible && item.report.tyre_condition && !["Good", "Not Visible"].includes(item.report.tyre_condition) && (
                      <span style={{ padding: "4px 10px", borderRadius: "20px", background: C.surface.warningSubtle, color: C.warning.default, fontSize: "11px", fontWeight: 600 }}>
                        Tyres: {item.report.tyre_condition}
                      </span>
                    )}
                  </div>

                  {/* Status & Action */}
                  <div style={{ paddingTop: "12px", borderTop: `1px solid ${C.border.subtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "11px", color: C.gray.caption, margin: 0 }}>Status</p>
                    <StatusBadge status={item.status} onChange={(newStatus) => handleStatusChange(item.id, newStatus)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Lightbox image={lightboxImage} title={lightboxTitle} onClose={() => setLightboxImage(null)} />
    </div>
  );
};

export default FleetRepairs;
