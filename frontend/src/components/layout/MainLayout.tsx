  import { useState } from "react";
  import { useNavigate, useLocation } from "react-router-dom";
  import {
    LayoutDashboard,
    Car,
    Users,
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

  // ✅ Use ONLY Mont everywhere
  const FONT = "Mont, sans-serif";

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
    // ✅ FIX: Asset Cost should be £ not $
    { label: "Asset Cost",       path: "/asset-cost",       icon: PoundSterling },
    { label: "Asset Allocation", path: "/asset-allocation", icon: GitFork },
  ];

  // ── Sub-nav button ────────────────────────────────────────────────────────────
  function NavBtn({
    item, active, collapsed, onClick,
  }: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
    const Icon = item.icon;
    return (
      <button
        className="w-full flex flex-row items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition"
        title={collapsed ? item.label : undefined}
        onClick={onClick}
        style={{
          justifyContent: collapsed ? "center" : "flex-start",
          background: active ? C.yellow : "transparent",
          border: active ? `1.5px solid ${C.blueDark}` : "1.5px solid transparent",
          borderRadius: "14px",
          boxShadow: active ? "0 4px 12px rgba(23,50,94,0.10)" : "none",
          color: active ? C.blueDark : C.blueDark,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = "rgba(241, 255, 36, 0.10)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Icon style={{ width: 18, height: 18, flexShrink: 0, color: active ? C.blue : C.gray }} />
        {!collapsed && (
          <span style={{
            fontSize: 14,
            fontWeight: active ? 800 : 500,
            color: active ? C.blueDark : C.bodyText,
            lineHeight: 1.2,
            fontFamily: 'MontBold, sans-serif',
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
    return (
      <button
        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition"
        onClick={onClick}
        title={collapsed ? label : undefined}
        style={{
          justifyContent: collapsed ? "center" : "space-between",
          background: "transparent",
          border: "none",
        }}
      >
        {collapsed ? (
          <span style={{
            fontSize: 10, fontWeight: 900, color: C.blue,
            fontFamily: 'MontBlack, sans-serif',
          }}>
            {label.split(" ").map(w => w[0]).join("")}
          </span>
        ) : (
          <span style={{
            fontSize: 13, fontWeight: 900, color: C.blueDark,
            textTransform: "uppercase", letterSpacing: "0.05em",
            fontFamily: 'MontBlack, sans-serif',
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
    return (
      <button
        className="w-full flex flex-row items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition"
        title={collapsed ? label : undefined}
        onClick={onClick}
        style={{
          justifyContent: collapsed ? "center" : "flex-start",
          background: active ? C.yellow : "transparent",
          border: active ? `1.5px solid ${C.blueDark}` : "1.5px solid transparent",
          borderRadius: "14px",
          boxShadow: active ? "0 4px 12px rgba(23,50,94,0.10)" : "none",
          color: active ? C.blueDark : C.blueDark,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = "rgba(241, 255, 36, 0.10)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Icon style={{ width: 18, height: 18, flexShrink: 0, color: active ? C.blue : C.gray }} />
        {!collapsed && (
          <span style={{
            fontSize: 14,
            fontWeight: active ? 800 : 500,
            color: active ? C.blueDark : C.bodyText,
            lineHeight: 1.2,
            fontFamily: 'MontBold, sans-serif',
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
      <div className="px-2 py-2">
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
            padding: "13px 16px",
            background: active ? C.blueDark : hov ? C.blueDark : C.blue,
            border: active ? `2px solid ${C.yellow}` : "2px solid transparent",
            borderRadius: 10,
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
            fontFamily: 'MontBold, sans-serif',
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
    <div style={{ height: 1, background: C.borderSubtle, margin: "10px 0" }} />
  );

  // ── Collapse toggle ───────────────────────────────────────────────────────────
  function CollapseBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 32, height: 32, borderRadius: 10,
          background: hov ? C.blueSubtle : C.white,
          border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 50,
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          transition: "background 0.15s ease, transform 0.15s ease",
          flexShrink: 0,
        }}
      >
        {collapsed
          ? <ChevronRight style={{ width: 16, height: 16, color: C.gray }} />
          : <ChevronLeft  style={{ width: 16, height: 16, color: C.gray }} />
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
  const userData = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user_data") || "{}");
    } catch {
      return {};
    }
  })();
  const userName = userData?.name || "User";
  const userSubtitle = userData?.email || "Microsoft account";
  const userRole = userData?.trade === "ALL" ? "Administrator" : (userData?.trade || "User");
  const userInitials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    const handleSignOut = () => {
      sessionStorage.removeItem("user_session");
      sessionStorage.removeItem("user_data");
      navigate("/login");
    };

    const isActive = (path: string) => location.pathname === path;
    const copilotActive = isActive("/copilot") || isActive("/chat") || isActive("/chatbot");

    return (
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: 'MontRegular, sans-serif' }}>
        <aside
          className="sticky top-0 flex h-screen flex-col bg-white shadow-sm flex-shrink-0"
          style={{
          background: C.white,
          borderRight: `1px solid ${C.border}`,
          width: collapsed ? 64 : 220,
          minWidth: collapsed ? 64 : 220,
          transition: "width 0.2s ease",
          overflow: "hidden",
          fontFamily: 'MontRegular, sans-serif',
          zIndex: 40,
        }}
        >

          <div
            style={{
              borderBottom: `1px solid ${C.border}`,
              padding: collapsed ? "14px 8px" : "20px 16px",
              minHeight: 78,
              display: "flex",
              flexDirection: collapsed ? "column" : "row",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: collapsed ? 8 : 12,
            }}
          >
            {collapsed ? (
              <>
                <img
                  src="/aspect-logo-icon.svg"
                  alt="Aspect"
                  style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
                />
                <CollapseBtn collapsed={collapsed} onClick={() => setCollapsed((v) => !v)} />
              </>
            ) : (
              <>
                <div className="flex items-center min-w-0" style={{ flex: 1 }}>
                  <img
                    src="/aspectLogo (1).svg"
                    alt="Aspect"
                    style={{ width: 165, height: 40, objectFit: "contain" }}
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
                              font-family:MontBlack, sans-serif;">A</span>
                          </div>
                          <span style="color:${C.blueDark};font-weight:800;font-size:22px;
                            font-family:MontBlack, sans-serif;">aspect</span>`;
                        p.appendChild(d);
                      }
                    }}
                  />
                </div>
                <CollapseBtn collapsed={collapsed} onClick={() => setCollapsed((v) => !v)} />
              </>
            )}
          </div>

          <nav className="px-2 py-2 flex flex-col gap-1 flex-1 overflow-y-auto" style={{ fontFamily: 'MontRegular, sans-serif' }}>
            <div>
              <ActionBtn
                label="Upload New Vehicle"
                icon={UploadCloud}
                active={isActive("/upload")}
                collapsed={collapsed}
                onClick={() => navigate("/upload")}
              />
            </div>

            <ActionBtn
              label="Register Asset"
              icon={PlusCircle}
              active={isActive("/upload-asset")}
              collapsed={collapsed}
              onClick={() => navigate("/upload-asset")}
            />

            {FLEET_ITEMS.map(item => (
              <NavBtn
                key={item.path}
                item={item}
                active={isActive(item.path)}
                collapsed={collapsed}
                onClick={() => navigate(item.path)}
              />
            ))}

            {ASSET_ITEMS.map(item => (
              <NavBtn
                key={item.path}
                item={item}
                active={isActive(item.path)}
                collapsed={collapsed}
                onClick={() => navigate(item.path)}
              />
            ))}

          </nav>

          <div
            className="border-t flex flex-col gap-2 px-2 py-3"
            style={{ borderColor: C.border, backgroundColor: C.white }}
          >
            {collapsed ? (
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "#F1FF24",
                  border: "2px solid #9FC3FC",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 900, color: C.blueDark,
                    fontFamily: "MontBlack, sans-serif", lineHeight: 1,
                  }}>{userInitials}</span>
                </div>
              </div>
            ) : (
              <div style={{
                background: "#D8E6FF",
                borderRadius: 16,
                border: "1px solid #9FC3FC",
                padding: "14px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{
                  width: 49, height: 49, borderRadius: "50%",
                  background: "#F1FF24",
                  border: "2px solid #9FC3FC",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 16, fontWeight: 900, color: C.blueDark,
                    fontFamily: "MontBlack, sans-serif", lineHeight: 1,
                  }}>{userInitials}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 10, color: "#848EA3", margin: "0 0 2px 0",
                    fontFamily: "MontRegular, sans-serif",
                  }}>Signed in as</p>
                  <p style={{
                    fontSize: 15, fontWeight: 800, color: C.blueDark, margin: "0 0 1px 0",
                    fontFamily: "MontBold, sans-serif", lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{userName}</p>
                  <p style={{
                    fontSize: 12, color: "#5A9CF6", margin: 0,
                    fontFamily: "MontBold, sans-serif",
                  }}>{userRole}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex flex-row gap-3 items-center rounded-lg px-3 py-2 border border-transparent transition text-left text-sm"
              style={{ color: C.blueDark, justifyContent: collapsed ? "center" : undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EEF2F8")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!collapsed && <span style={{ fontFamily: 'MontBold, sans-serif' }}>Log out</span>}
            </button>
          </div>

        </aside>

        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "auto",
          width: `calc(100% - ${collapsed ? 64 : 220}px)`,
          fontFamily: 'MontRegular, sans-serif',
          transition: "width 0.2s ease",
        }}>
          {children}
        </div>

        <button
          onClick={() => navigate("/chatbot")}
          title="Open Chumley Agent"
          aria-label="Open Chumley Agent"
          style={{
            position: "fixed",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            width: 62,
            minHeight: 236,
            padding: "22px 10px",
            borderRadius: "24px 0 0 24px",
            border: copilotActive ? `2px solid ${C.yellow}` : "none",
            background: "linear-gradient(180deg, #EF4444 0%, #F97316 100%)",
            color: C.white,
            boxShadow: "0 18px 32px rgba(239, 68, 68, 0.28)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              color: C.white,
              flexShrink: 0,
              fontSize: 18,
              lineHeight: 1,
              fontFamily: "MontBold, sans-serif",
            }}
          >
            ✦
          </span>
          <span
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "MontBold, sans-serif",
            }}
          >
            Chumley Agent
          </span>
        </button>
      </div>
    );
  }
