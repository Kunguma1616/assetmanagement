import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FleetDashboard from "./pages/FleetDashboard";
import Webfleet from "./pages/webfleet";
import Upload from "./pages/Upload";
import RegisterAsset from "./pages/RegisterAsset";
import VehicleLookup from "./pages/VehicleLookup";
import AssetsGallery from "./pages/AssetsGallery";
import AssetDetail from "./pages/AssetDetail";
import NotFound from "./pages/NotFound";
import ChatBot from "./pages/chatbot";
import VehicleCostAnalysis from "./pages/VehicleCostAnalysis";
import HSBCLeases from "./pages/HSBCLeases";
import ServiceCostLookup from "./pages/ServiceCostLookup";
import CostAnalysisPage from "./pages/CostAnalysisPage";
import Index from "./pages/Index";
import VehicleCondition from "./pages/vehicleCondition";
import AssetDashboard from "./pages/AssetDashboad";
import AssetCostPage from "./pages/AssetCost";
import AssetAllocation from "./pages/Assetallocation";
import VehicleCostSimple from "./pages/VehicleCostSimple";
import ServiceMaintenanceCosts from "./pages/ServiceMaintenanceCosts";
import MainLayout from "./components/layout/MainLayout";

const queryClient = new QueryClient();

// ✅ Are we running inside Navigator's iframe?
const isInIframe = () => {
  try { return window.self !== window.top; }
  catch { return true; }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [embedFailed, setEmbedFailed]         = useState(false);

  useEffect(() => {
    let finished = false;

    const saveSession = (session: string, user: string, userEmail: string, trade?: string) => {
      sessionStorage.setItem("user_session", session);
      sessionStorage.setItem("user_data", JSON.stringify({
        name:    user,
        email:   userEmail,
        session,
        trade:   trade || "ALL",
      }));
    };

    const finish = (authenticated: boolean) => {
      if (finished) return;
      finished = true;
      setIsAuthenticated(authenticated);
      setLoading(false);
    };

    const cleanUrl = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const exchangeEmbedToken = (embedToken: string) => {
      console.log("🔗 Embed token detected — exchanging for session...");
      fetch(`/api/auth/exchange-embed-token?token=${encodeURIComponent(embedToken)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.session_id) {
            console.log("✅ Embed login successful:", data.user, "| Trade:", data.trade);
            saveSession(data.session_id, data.user, data.email, data.trade);
            cleanUrl();
            finish(true);
          } else {
            console.error("❌ Embed token exchange failed:", data.detail || data.error);
            // ✅ If in iframe, show error instead of redirecting to login
            if (isInIframe()) {
              setEmbedFailed(true);
              finish(false);
            } else {
              finish(false);
            }
          }
        })
        .catch((err) => {
          console.error("❌ Embed token network error:", err);
          if (isInIframe()) {
            setEmbedFailed(true);
            finish(false);
          } else {
            finish(false);
          }
        });
    };

    const bootstrapFromParams = (params: URLSearchParams) => {
      const embedToken = params.get("token");
      if (embedToken) {
        exchangeEmbedToken(embedToken);
        return true;
      }

      const session    = params.get("session");
      const user       = params.get("user");
      const userEmail  = params.get("email");
      const trade      = params.get("trade");

      if (session && user && userEmail) {
        console.log("✅ OAuth/embed callback detected, saving session...");
        saveSession(session, user, userEmail, trade || "ALL");
        cleanUrl();
        finish(true);
        return true;
      }

      return false;
    };

    const queryParams = new URLSearchParams(window.location.search);
    if (bootstrapFromParams(queryParams)) return;

    const hash      = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    if (bootstrapFromParams(hashParams)) return;

    const handleEmbedMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "aspect-embed-auth" && typeof data.token === "string" && data.token) {
        window.removeEventListener("message", handleEmbedMessage);
        exchangeEmbedToken(data.token);
        return;
      }

      if (
        data.type === "aspect-embed-session" &&
        typeof data.session === "string" &&
        typeof data.user   === "string" &&
        typeof data.email  === "string"
      ) {
        window.removeEventListener("message", handleEmbedMessage);
        console.log("✅ Session received from parent window");
        saveSession(data.session, data.user, data.email, data.trade || "ALL");
        finish(true);
      }
    };

    window.addEventListener("message", handleEmbedMessage);

    // ✅ Existing session — already logged in
    const sessionId = sessionStorage.getItem("user_session");
    if (sessionId) {
      console.log("ProtectedRoute check - sessionId:", true);
      window.removeEventListener("message", handleEmbedMessage);
      finish(true);
      return;
    }

    console.log("ProtectedRoute check - sessionId:", false);

    // Give parent iframe host time to send token via postMessage
    // ✅ Longer timeout in iframe (3s) to allow Navigator to send the token
    const timeoutMs = isInIframe() ? 3000 : 1500;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", handleEmbedMessage);
      // ✅ If in iframe and still no session, show error — NOT Microsoft OAuth
      if (isInIframe()) {
        console.warn("⚠️ In iframe but no token received — showing reload message");
        setEmbedFailed(true);
      }
      finish(false);
    }, timeoutMs);

    return () => {
      finished = true;
      window.removeEventListener("message", handleEmbedMessage);
      window.clearTimeout(timer);
    };
  }, []);

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ✅ Inside iframe with no valid session — show friendly message, NOT login redirect
  if (!isAuthenticated && isInIframe()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-bold text-slate-800">Session Expired</h2>
        <p className="text-slate-600 text-sm max-w-xs">
          Your session has expired. Please reload Navigator to reconnect.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    );
  }

  // ── Not authenticated in standalone mode → go to login ────────────────────
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><FleetDashboard /></ProtectedRoute>} />
          <Route path="/fleet-dashboard" element={<ProtectedRoute><FleetDashboard /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><ChatBot /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatBot /></ProtectedRoute>} />
          <Route path="/copilot" element={<ProtectedRoute><ChatBot /></ProtectedRoute>} />
          <Route path="/webfleet" element={<ProtectedRoute><Webfleet /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/vehicle-lookup" element={<ProtectedRoute><VehicleLookup /></ProtectedRoute>} />
          <Route path="/upload-asset" element={<ProtectedRoute><RegisterAsset /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><AssetsGallery /></ProtectedRoute>} />
          <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
          <Route path="/index" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/vehicle-cost-analysis" element={<ProtectedRoute><HSBCLeases /></ProtectedRoute>} />
          <Route path="/service-cost" element={<ProtectedRoute><ServiceCostLookup /></ProtectedRoute>} />
          <Route path="/vehicle-cost" element={<ProtectedRoute><ServiceMaintenanceCosts /></ProtectedRoute>} />
          <Route path="/By Cost" element={<ProtectedRoute><CostAnalysisPage /></ProtectedRoute>} />
          <Route path="/vehicle-condition" element={<ProtectedRoute><VehicleCondition /></ProtectedRoute>} />
          <Route path="/asset-dashboard" element={<ProtectedRoute><AssetDashboard /></ProtectedRoute>} />
          <Route path="/asset-cost" element={<ProtectedRoute><AssetCostPage /></ProtectedRoute>} />
          <Route path="/asset-allocation" element={<ProtectedRoute><AssetAllocation /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
