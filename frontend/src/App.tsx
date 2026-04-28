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
import VehicleCostSimple from "./pages/VehicleCostSimple"; // ✅ Added
import ServiceMaintenanceCosts from "./pages/ServiceMaintenanceCosts"; // ✅ Service & Maintenance
import MainLayout from "./components/layout/MainLayout";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ✅ EMBED TOKEN — Navigator passes ?token=<jwt> to skip Microsoft OAuth entirely
    const embedToken = params.get("token");
    if (embedToken) {
      console.log("🔗 Embed token detected — exchanging for session...");
      fetch(`/api/auth/exchange-embed-token?token=${encodeURIComponent(embedToken)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.session_id) {
            console.log("✅ Embed login successful:", data.user, "| Trade:", data.trade);
            sessionStorage.setItem("user_session", data.session_id);
            sessionStorage.setItem(
              "user_data",
              JSON.stringify({
                name: data.user,
                email: data.email,
                session: data.session_id,
                trade: data.trade || "ALL",
              })
            );
            // Clean token out of the URL bar
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsAuthenticated(true);
          } else {
            console.error("❌ Embed token exchange failed:", data.detail || data.error);
            setIsAuthenticated(false);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("❌ Embed token network error:", err);
          setIsAuthenticated(false);
          setLoading(false);
        });
      return; // Don't fall through to normal session check
    }

    // ✅ NORMAL OAUTH CALLBACK — ?session=...&user=...&email=... in URL
    const session = params.get("session");
    const user = params.get("user");
    const userEmail = params.get("email");
    const trade = params.get("trade");

    if (session && user && userEmail) {
      console.log("✅ OAuth callback detected, saving session...");
      sessionStorage.setItem("user_session", session);
      sessionStorage.setItem("user_data", JSON.stringify({ name: user, email: userEmail, session, trade: trade || "ALL" }));
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    // ✅ EXISTING SESSION — already logged in
    const sessionId = sessionStorage.getItem("user_session");
    console.log("ProtectedRoute check - sessionId:", !!sessionId);
    setIsAuthenticated(!!sessionId);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <FleetDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fleet-dashboard"
            element={
              <ProtectedRoute>
                <FleetDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <ChatBot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatBot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/copilot"
            element={
              <ProtectedRoute>
                <ChatBot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/webfleet"
            element={
              <ProtectedRoute>
                <Webfleet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle-lookup"
            element={
              <ProtectedRoute>
                <VehicleLookup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-asset"
            element={
              <ProtectedRoute>
                <RegisterAsset />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsGallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:id"
            element={
              <ProtectedRoute>
                <AssetDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/index"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle-cost-analysis"
            element={
              <ProtectedRoute>
                <HSBCLeases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-cost"
            element={
              <ProtectedRoute>
                <ServiceCostLookup />
              </ProtectedRoute>
            }
          />
          {/* ✅ UPDATED: /vehicle-cost now shows Service & Maintenance Costs */}
          <Route
            path="/vehicle-cost"
            element={
              <ProtectedRoute>
                <ServiceMaintenanceCosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/By Cost"
            element={
              <ProtectedRoute>
                <CostAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle-condition"
            element={
              <ProtectedRoute>
                <VehicleCondition />
              </ProtectedRoute>
            }
          />

          {/* ─── Asset Pages ─── */}
          <Route
            path="/asset-dashboard"
            element={
              <ProtectedRoute>
                <AssetDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asset-cost"
            element={
              <ProtectedRoute>
                <AssetCostPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/asset-allocation"
            element={
              <ProtectedRoute>
                <AssetAllocation />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
