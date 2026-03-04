import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, Shield, XCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  useEffect(() => {
    console.log("=== Login Component Mounted ===");

    const errorParam = searchParams.get("error");
    const user = searchParams.get("user");
    const userEmail = searchParams.get("email");
    const session = searchParams.get("session");
    const trade = searchParams.get("trade"); // ✅ trade filter from backend

    if (errorParam) {
      console.error("❌ OAuth error:", errorParam);
      if (errorParam === "unauthorized_user" || errorParam === "unauthorized_domain") {
        setUnauthorized(true);
      } else {
        setError(`Authentication failed: ${errorParam}`);
      }
      window.history.replaceState({}, document.title, "/login");
      return;
    }

    if (user && userEmail && session) {
      console.log("✅ OAuth successful:", user, "| Trade:", trade);

      // ✅ Save everything including trade to sessionStorage
      const userData = {
        name: user,
        email: userEmail,
        session,
        trade: trade || "ALL", // "ALL" = no restriction, else e.g. "Drainage & Plumbing"
      };
      sessionStorage.setItem("user_session", session);
      sessionStorage.setItem("user_data", JSON.stringify(userData));

      setWelcomeName(user);
      setTimeout(() => {
        window.history.replaceState({}, document.title, "/");
        navigate("/", { replace: true });
      }, 1500);
      return;
    }

    const existingSession = sessionStorage.getItem("user_session");
    if (existingSession) {
      navigate("/", { replace: true });
      return;
    }

    console.log("No authentication found, showing login page");
  }, [navigate, searchParams]);

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      window.location.href = API_ENDPOINTS.MICROSOFT_AUTH;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start authentication";
      setError(errorMsg);
      setLoading(false);
    }
  };

  // ✅ WELCOME BACK SCREEN
  if (welcomeName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden text-center">
            <div className="px-8 py-12 bg-green-50 border-b border-green-200">
              <div className="flex items-center justify-center mx-auto mb-4 w-20 h-20">
                <img src="/aspect-logo-icon.svg" alt="ASPECT Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-4xl mb-3">👋</div>
              <h1 className="text-2xl font-bold text-green-900 mb-1">Welcome back,</h1>
              <h2 className="text-3xl font-extrabold text-green-700 mb-3">{welcomeName}!</h2>
              <p className="text-sm text-green-600">Redirecting you to the dashboard...</p>
            </div>
            <div className="px-8 py-6 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              <span className="text-slate-600 text-sm">Loading Fleet & Asset Management...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ❌ UNAUTHORIZED SCREEN
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
            <div className="px-8 py-10 text-center bg-red-50 border-b border-red-200">
              <div className="flex items-center justify-center mx-auto mb-4 w-20 h-20 bg-red-100 rounded-full">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h1>
              <p className="text-sm text-red-700">You do not have permission to access this system.</p>
            </div>
            <div className="px-8 py-8 text-center">
              <p className="text-slate-700 text-base leading-relaxed mb-2">
                Sorry, your account is <strong>not authorised</strong> to use the
              </p>
              <p className="text-slate-900 font-semibold text-lg mb-6">Fleet & Asset Management System</p>
              <p className="text-slate-600 text-sm mb-8">
                If you believe this is a mistake, please contact your IT administrator to request access.
              </p>
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Connecting...</span></> : <span>Try a different account</span>}
              </button>
            </div>
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Shield className="h-4 w-4" />
                <span>Protected by Microsoft OAuth 2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ NORMAL LOGIN SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-10 text-center border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
            <div className="flex items-center justify-center mx-auto mb-4 w-20 h-20">
              <img src="/aspect-logo-icon.svg" alt="ASPECT Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Fleet & Asset Management System</h1>
            <p className="text-sm text-slate-600">Sign in with your Microsoft account</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Authentication Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /><span>Connecting to Microsoft...</span></>
              ) : (
                <>
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6v-11.4H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 text-center">
                <strong>Secure Authentication</strong><br />
                <span className="text-blue-700">Use your organisation's Microsoft 365 account</span>
              </p>
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
              <Shield className="h-4 w-4" />
              <span>Protected by Microsoft OAuth 2.0</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Need help?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact your IT administrator for support."); }}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Contact Support</a>
          </p>
        </div>
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>© 2026 Fleet & Asset Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
