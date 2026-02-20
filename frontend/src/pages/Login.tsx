import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, Shield } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("=== Login Component Mounted ===");
    console.log("Current URL:", window.location.href);
    console.log("Search params:", Object.fromEntries(searchParams));

    // Check if already authenticated
    const sessionId = sessionStorage.getItem("user_session");
    if (sessionId) {
      console.log("✅ User already authenticated, navigating to dashboard...");
      navigate("/", { replace: true });
      return;
    }

    // Handle Microsoft OAuth callback with role-based auth
    const user = searchParams.get("user");
    const userEmail = searchParams.get("email");
    const role = searchParams.get("role");
    const engineerId = searchParams.get("engineerId");
    const managedEngineerIds = searchParams.get("managedEngineerIds");
    const errorParam = searchParams.get("error");

    console.log("OAuth callback params:", { 
      user, 
      userEmail, 
      role,
      engineerId: engineerId ? "present" : "none",
      managedEngineerIds: managedEngineerIds ? "present" : "none",
      error: errorParam
    });

    if (errorParam) {
      console.error("❌ OAuth error:", errorParam);
      handleOAuthError(errorParam, userEmail);
      return;
    }

    // Check if we have role (successful authentication)
    if (user && userEmail && role) {
      console.log("✅ OAuth successful, user:", user, "role:", role);
      console.log("📝 Saving user data to sessionStorage...");
      
      const userData: any = { name: user, email: userEmail, role };
      if (engineerId) userData.engineerId = engineerId;
      if (managedEngineerIds) userData.managedEngineerIds = managedEngineerIds;
      
      sessionStorage.setItem("user_session", userEmail);
      sessionStorage.setItem("user_data", JSON.stringify(userData));
      
      console.log("🔄 Navigating to FleetDashboard...");
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
      navigate("/", { replace: true });
      return;
    }

    // No auth params found, show login page
    console.log("No authentication in URL, showing login page");
  }, [navigate, searchParams]);

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔐 Initiating Microsoft OAuth...");
      console.log("Redirecting to:", API_ENDPOINTS.MICROSOFT_AUTH);
      window.location.href = API_ENDPOINTS.MICROSOFT_AUTH;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start authentication";
      setError(errorMsg);
      setLoading(false);
      console.error("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-10 text-center border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Fleet Health Monitor
            </h1>
            <p className="text-sm text-slate-600">
              Sign in with your Microsoft account
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Authentication Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Microsoft Sign-In Button */}
            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting to Microsoft...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6v-11.4H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>

            {/* Info Text */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 text-center">
                <strong>Secure Authentication</strong>
                <br />
                <span className="text-blue-700">
                  Use your organization's Microsoft 365 account
                </span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
              <Shield className="h-4 w-4" />
              <span>Protected by Microsoft OAuth 2.0</span>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Need help?{" "}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                alert("Please contact your IT administrator for support.");
              }}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>© 2026 Fleet Health Monitor. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}