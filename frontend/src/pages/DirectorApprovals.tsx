import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader } from "lucide-react";

interface Approval {
  id: string;
  name: string;
  description: string;
  creditAmount: number;
  submittedBy: string;
  submittedByEmail: string;
  submittedDate: string;
  status: string;
  managerApprovedBy: string;
  managerApprovalDate: string;
}

const C = {
  brand: { blue: "#27549D", yellow: "#F1FF24" },
  primary: { light: "#7099DB", default: "#27549D", darker: "#17325E", subtle: "#F7F9FD" },
  success: { light: "#A8D5BA", default: "#40916C", darker: "#1B4B35", subtle: "#E8F5F1" },
  error: { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#FAEDEA" },
  warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FEF5EC" },
  gray: {
    title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3",
    negative: "#F3F4F6", disabled: "#CDD1DA", border: "#CDD1DA",
    borderSubtle: "#E8EAEE", surface: "#F3F4F6",
  },
};

const FONT = "'Mont', 'Montserrat', sans-serif";
const API_BASE = "/api/approvals";

const DirectorApprovals: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Approval | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/director/pending`);
      if (!res.ok) throw new Error("Failed to load approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approve: boolean) => {
    if (!selectedRecord) return;
    try {
      setSubmitting(true);
      const userData = JSON.parse(sessionStorage.getItem("user_data") || "{}");
      const res = await fetch(`${API_BASE}/director/approve/${selectedRecord.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedRecord.id,
          approverEmail: userData.email,
          approverName: userData.name,
          action: approve ? "approve" : "reject",
          comment,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit approval");
      setSelectedRecord(null);
      setAction(null);
      setComment("");
      loadApprovals();
    } catch (e) {
      console.error(e);
      alert("Error submitting approval");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <Loader size={40} color={C.primary.default} />
          <p style={{ color: C.gray.subtle, marginTop: "16px" }}>Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, background: C.gray.surface, minHeight: "100vh", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, color: C.gray.title, margin: "0 0 8px 0" }}>
          Director Approvals
        </h1>
        <p style={{ fontSize: "14px", color: C.gray.subtle, margin: 0 }}>
          {approvals.length} request{approvals.length !== 1 ? "s" : ""} pending your approval
        </p>
      </div>

      {approvals.length === 0 ? (
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
          <CheckCircle size={64} color={C.success.default} />
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: C.gray.title, margin: "20px 0 8px 0" }}>
            All Caught Up!
          </h2>
          <p style={{ fontSize: "14px", color: C.gray.subtle }}>
            No pending requests at the moment. Great job! 🎉
          </p>
        </div>
      ) : (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {approvals.map((approval) => (
            <div
              key={approval.id}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${C.gray.border}`,
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "16px",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
              onClick={() => setSelectedRecord(approval)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: C.gray.title, margin: "0 0 4px 0" }}>
                    {approval.name}
                  </h3>
                  <p style={{ fontSize: "13px", color: C.gray.subtle, margin: 0 }}>
                    Submitted by: {approval.submittedBy}
                  </p>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: C.primary.default }}>
                  £{approval.creditAmount.toLocaleString()}
                </div>
              </div>

              <p style={{ fontSize: "13px", color: C.gray.body, margin: "0 0 16px 0", lineHeight: 1.6 }}>
                {approval.description}
              </p>

              <div style={{ display: "flex", gap: "32px", fontSize: "12px", color: C.gray.caption }}>
                <div>
                  <p style={{ margin: "0 0 4px 0" }}>Submitted</p>
                  <p style={{ margin: 0, fontWeight: 600, color: C.gray.body }}>
                    {new Date(approval.submittedDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0" }}>Manager Approved</p>
                  <p style={{ margin: 0, fontWeight: 600, color: C.success.default }}>
                    {approval.managerApprovedBy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedRecord && !action && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.gray.title, margin: "0 0 16px 0" }}>
              {selectedRecord.name}
            </h2>
            <div style={{ background: C.primary.subtle, padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: C.gray.subtle, margin: "0 0 4px 0" }}>Credit Amount</p>
              <p style={{ fontSize: "24px", fontWeight: 700, color: C.primary.default, margin: 0 }}>
                £{selectedRecord.creditAmount.toLocaleString()}
              </p>
            </div>

            <p style={{ fontSize: "13px", color: C.gray.body, margin: "0 0 16px 0", lineHeight: 1.6 }}>
              {selectedRecord.description}
            </p>

            <div style={{ background: C.gray.negative, padding: "12px", borderRadius: "8px", marginBottom: "24px", fontSize: "12px", color: C.gray.subtle }}>
              <p style={{ margin: "0 0 4px 0" }}>Manager: {selectedRecord.managerApprovedBy}</p>
              <p style={{ margin: "0 0 4px 0" }}>Submitted by: {selectedRecord.submittedBy}</p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setAction("reject")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: `2px solid ${C.error.default}`,
                  background: "transparent",
                  color: C.error.default,
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Reject
              </button>
              <button
                onClick={() => setAction("approve")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: C.success.default,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {selectedRecord && action && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setAction(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.gray.title, margin: "0 0 16px 0" }}>
              {action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </h2>

            <p style={{ fontSize: "13px", color: C.gray.body, margin: "0 0 20px 0" }}>
              {action === "approve"
                ? "This will move the request to Finance for final approval."
                : "This will reject the request and send it back to the manager."}
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: C.gray.subtle, display: "block", marginBottom: "8px" }}>
                {action === "approve" ? "Approval Comment" : "Rejection Reason"} (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={action === "approve" ? "Add any notes..." : "Please explain why..."}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${C.gray.border}`,
                  fontSize: "13px",
                  fontFamily: FONT,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setAction(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${C.gray.border}`,
                  background: C.gray.negative,
                  color: C.gray.subtle,
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproval(action === "approve")}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: action === "approve" ? C.success.default : C.error.default,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: FONT,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Processing..." : action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorApprovals;
