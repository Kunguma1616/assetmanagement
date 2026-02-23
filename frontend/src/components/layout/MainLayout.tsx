import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  Users,
  DollarSign,
  Wrench,
  BarChart3,
  UploadCloud,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  GitFork,
  PoundSterling,
  MessageCircle,
} from "lucide-react";

// ── Design-system colours ────────────────────────────────────────────────────
const C = {
  blue:         "#27549D",
  blueDark:     "#17325E",
  blueSubtle:   "#F7F9FD",
  yellow:       "#F1FF24",
  gray:         "#646F86",
  bodyText:     "#323843",
  title:        "#1A1D23",
  caption:      "#848EA3",
  border:       "#CDD1DA",
  borderSubtle: "#F3F4F6",
  red:          "#D15134",
  white:        "#FFFFFF",
  bg:           "#F3F4F6",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path:  string;
  icon:  React.ElementType;
}

// ── Nav data ─────────────────────────────────────────────────────────────────
const FLEET_ITEMS: NavItem[] = [
  { label: "Fleet Dashboard",             path: "/fleet-dashboard",   icon: LayoutDashboard },
  { label: "Fleet Portfolio",             path: "/assets",            icon: Car },
  { label: "Vehicle Cost",                path: "/vehicle-cost",      icon: PoundSterling },
  { label: "Vehicle Condition",           path: "/vehicle-condition", icon: Wrench },
  { label: "Driver Performance Analysis", path: "/webfleet",          icon: Users },
];

const ASSET_ITEMS: NavItem[] = [
  { label: "Asset Dashboard",  path: "/asset-dashboard",  icon: BarChart3 },
  { label: "Asset Cost",       path: "/asset-cost",       icon: DollarSign },
  { label: "Asset Allocation", path: "/asset-allocation", icon: GitFork },
];

// ── Sub-nav button ────────────────────────────────────────────────────────────
function NavBtn({
  item, active, collapsed, onClick,
}: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  return (
    <button
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 16px 9px 28px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? C.yellow : hov ? C.borderSubtle : "transparent",
        border: "none",
        borderLeft: active ? `3px solid ${C.blue}` : "3px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <Icon style={{ width: 16, height: 16, flexShrink: 0, color: active ? C.blue : C.gray }} />
      {!collapsed && (
        <span style={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          color: active ? C.blueDark : hov ? C.blue : C.bodyText,
          lineHeight: 1.3,
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {item.label}
        </span>
      )}
    </button>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────
function GroupHeader({
  label, open, collapsed, onClick,
}: { label: string; open: boolean; collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "10px 0" : "10px 16px",
        background: hov ? C.borderSubtle : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {collapsed ? (
        <span style={{
          fontSize: 10, fontWeight: 900, color: C.blue,
          fontFamily: "Montserrat,sans-serif",
        }}>
          {label.split(" ").map(w => w[0]).join("")}
        </span>
      ) : (
        <span style={{
          fontSize: 11, fontWeight: 800, color: C.blue,
          textTransform: "uppercase", letterSpacing: "0.07em",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {label}
        </span>
      )}
      {!collapsed && (
        open
          ? <ChevronUp   style={{ width: 13, height: 13, color: C.blue, flexShrink: 0 }} />
          : <ChevronDown style={{ width: 13, height: 13, color: C.blue, flexShrink: 0 }} />
      )}
    </button>
  );
}

// ── Action button (Upload / Register) ────────────────────────────────────────
function ActionBtn({
  label, icon: Icon, active, collapsed, onClick,
}: { label: string; icon: React.ElementType; active: boolean; collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={collapsed ? label : undefined}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? C.yellow : hov ? C.borderSubtle : "transparent",
        border: "none",
        borderLeft: active ? `3px solid ${C.blue}` : "3px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <Icon style={{ width: 16, height: 16, flexShrink: 0, color: active ? C.blue : C.gray }} />
      {!collapsed && (
        <span style={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          color: active ? C.blueDark : hov ? C.blue : C.bodyText,
          lineHeight: 1.3,
          fontFamily: "Montserrat, Inter, sans-serif",
        }}>
          {label}
        </span>
      )}
    </button>
  );
}

// ── Chumley Copilot AI button ─────────────────────────────────────────────────
function CopilotBtn({ collapsed, active, onClick }: { collapsed: boolean; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);

  if (collapsed) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
        <button
          title="Chumley Copilot AI"
          onClick={onClick}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: active ? C.blueDark : hov ? C.blueDark : C.blue,
            border: active ? `2px solid ${C.yellow}` : "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(39,84,157,0.30)",
            transition: "background 0.15s",
          }}
        >
          <MessageCircle style={{ width: 16, height: 16, color: C.white }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "6px 12px" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "9px 14px",
          background: active ? C.blueDark : hov ? C.blueDark : C.blue,
          border: active ? `2px solid ${C.yellow}` : "2px solid transparent",
          borderRadius: 8,
          cursor: "pointer",
          transition: "background 0.15s, box-shadow 0.15s, border 0.15s",
          boxShadow: hov || active
            ? "0 4px 14px rgba(39,84,157,0.40)"
            : "0 2px 8px rgba(39,84,157,0.25)",
        }}
      >
        <MessageCircle style={{ width: 15, height: 15, color: C.white, flexShrink: 0 }} />
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.white,
          fontFamily: "Montserrat, Inter, sans-serif",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
        }}>
          Chumley Copilot AI
        </span>
      </button>
    </div>
  );
}

// ── Thin divider ─────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, background: C.borderSubtle, margin: "6px 0" }} />
);

// ── Sign-out button ───────────────────────────────────────────────────────────
function SignOutBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? "Sign Out" : undefined}
      style={{
        width: "100%", display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 8, background: "transparent", border: "none", cursor: "pointer",
        padding: 0, color: hov ? C.red : C.caption,
        fontSize: 12, fontWeight: 600,
        fontFamily: "Montserrat, Inter, sans-serif",
        transition: "color 0.15s",
      }}
    >
      <LogOut style={{ width: 14, height: 14, flexShrink: 0 }} />
      {!collapsed && "Sign Out"}
    </button>
  );
}

// ── Collapse toggle ───────────────────────────────────────────────────────────
function CollapseBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute", right: -12, top: 78,
        width: 24, height: 24, borderRadius: "50%",
        background: hov ? C.blueSubtle : C.white,
        border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", zIndex: 50,
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        transition: "background 0.15s",
      }}
    >
      {collapsed
        ? <ChevronRight style={{ width: 12, height: 12, color: C.gray }} />
        : <ChevronLeft  style={{ width: 12, height: 12, color: C.gray }} />
      }
    </button>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
interface MainLayoutProps { children: React.ReactNode }

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed,  setCollapsed]  = useState(false);
  const [fleetOpen,  setFleetOpen]  = useState(true);
  const [assetOpen,  setAssetOpen]  = useState(true);

  const rawUser  = sessionStorage.getItem("user_data");
  const userData = rawUser ? JSON.parse(rawUser) : { name: "User", email: "" };

  const handleSignOut = () => {
    sessionStorage.removeItem("user_session");
    sessionStorage.removeItem("user_data");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  // ── Check if copilot route is active ──
  const copilotActive = isActive("/copilot") || isActive("/chat") || isActive("/chatbot");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        background: C.white,
        borderRight: `1px solid ${C.border}`,
        width:    collapsed ? 64 : 234,
        minWidth: collapsed ? 64 : 234,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "width 0.3s ease, min-width 0.3s ease",
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "16px 0" : "16px 20px",
          borderBottom: `1px solid ${C.border}`,
          minHeight: 68,
        }}>
          {!collapsed ? (
            <img
              src="/aspectLogo (1).svg"
              alt="Aspect"
              style={{ height: 36, width: "auto" }}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
                const p = t.parentElement;
                if (p && !p.querySelector(".logo-fb")) {
                  const d = document.createElement("div");
                  d.className = "logo-fb";
                  d.style.cssText = "display:flex;align-items:center;gap:8px;";
                  d.innerHTML = `
                    <div style="width:32px;height:32px;border-radius:8px;background:${C.yellow};
                      display:flex;align-items:center;justify-content:center;">
                      <span style="color:${C.blueDark};font-weight:900;font-size:14px;
                        font-family:Montserrat,sans-serif;">A</span>
                    </div>
                    <span style="color:${C.blueDark};font-weight:800;font-size:22px;
                      font-family:Montserrat,sans-serif;">aspect</span>`;
                  p.appendChild(d);
                }
              }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.yellow,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: C.blueDark, fontWeight: 900, fontSize: 14, fontFamily: "Montserrat,sans-serif" }}>
                A
              </span>
            </div>
          )}
        </div>

        {/* Scrollable nav area */}
        <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>

          {/* Upload New Vehicle */}
          <div style={{ paddingTop: 8 }}>
            <ActionBtn
              label="Upload New Vehicle"
              icon={UploadCloud}
              active={isActive("/upload")}
              collapsed={collapsed}
              onClick={() => navigate("/upload")}
            />
          </div>

          {/* Register Asset */}
          <ActionBtn
            label="Register Asset"
            icon={PlusCircle}
            active={isActive("/upload-asset")}
            collapsed={collapsed}
            onClick={() => navigate("/upload-asset")}
          />

          <Divider />

          {/* ── Chumley Copilot AI — active state wired to /copilot route ── */}
          <CopilotBtn
            collapsed={collapsed}
            active={copilotActive}
            onClick={() => navigate("/copilot")}
          />

          <Divider />

          {/* Fleet Management */}
          <GroupHeader
            label="Fleet Management"
            open={fleetOpen}
            collapsed={collapsed}
            onClick={() => setFleetOpen(o => !o)}
          />
          {fleetOpen && FLEET_ITEMS.map(item => (
            <NavBtn
              key={item.path}
              item={item}
              active={isActive(item.path)}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
            />
          ))}

          <Divider />

          {/* Asset Management */}
          <GroupHeader
            label="Asset Management"
            open={assetOpen}
            collapsed={collapsed}
            onClick={() => setAssetOpen(o => !o)}
          />
          {assetOpen && ASSET_ITEMS.map(item => (
            <NavBtn
              key={item.path}
              item={item}
              active={isActive(item.path)}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
            />
          ))}

        </nav>

        {/* User + sign-out */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: C.blue,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: C.white, fontWeight: 800, fontSize: 12, fontFamily: "Montserrat,sans-serif" }}>
                  {(userData.name?.[0] ?? "U").toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 12, fontWeight: 700, color: C.title, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontFamily: "Montserrat,sans-serif",
                }}>
                  {userData.name}
                </p>
                <p style={{ fontSize: 10, color: C.caption, margin: 0, fontFamily: "Montserrat,sans-serif" }}>
                  Authenticated
                </p>
              </div>
            </div>
          )}
          <SignOutBtn collapsed={collapsed} onClick={handleSignOut} />
        </div>

        {/* Collapse toggle */}
        <CollapseBtn collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
      </aside>

      {/* ── Page content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}