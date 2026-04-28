from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/approvals", tags=["approvals"])
sf_service = SalesforceService()

# ─── Models ───────────────────────────────────────────────────────────────────

class ApprovalRequest(BaseModel):
    id: str
    description: str
    creditAmount: float
    submittedBy: str
    submittedDate: str
    status: str  # "Pending Manager", "Manager Approved", "Pending Director", "Director Approved", "Pending Finance", "Finance Approved"
    managerApprovalDate: str = None
    managerApprovedBy: str = None
    directorApprovalDate: str = None
    directorApprovedBy: str = None
    financeApprovalDate: str = None
    financeApprovedBy: str = None

class ApprovalAction(BaseModel):
    recordId: str
    approverEmail: str
    approverName: str
    action: str  # "approve" or "reject"
    comment: str = None

# ─── Director Approvals Page ──────────────────────────────────────────────────
# Shows: Manager-Approved requests (status: "Manager Approved")

@router.get("/director/pending")
def get_director_pending_approvals():
    """
    Returns all requests that have been approved by manager
    and are now pending director approval
    """
    try:
        print("[DIRECTOR_APPROVALS] Fetching pending director approvals...")
        
        # Query Salesforce for approval records
        # Assuming we have an Approval_Request__c object
        result = sf_service.execute_soql("""
            SELECT 
                Id,
                Name,
                Description__c,
                Credit_Amount__c,
                Submitted_By__r.Name,
                Submitted_By__r.Email,
                Submitted_Date__c,
                Status__c,
                Manager_Approval_Date__c,
                Manager_Approved_By__r.Name,
                CreatedDate
            FROM Approval_Request__c
            WHERE Status__c = 'Manager Approved'
            ORDER BY Submitted_Date__c DESC
        """) or []
        
        approvals = []
        for rec in result:
            approvals.append({
                "id": rec.get("Id"),
                "name": rec.get("Name"),
                "description": rec.get("Description__c"),
                "creditAmount": rec.get("Credit_Amount__c", 0),
                "submittedBy": (rec.get("Submitted_By__r") or {}).get("Name"),
                "submittedByEmail": (rec.get("Submitted_By__r") or {}).get("Email"),
                "submittedDate": rec.get("Submitted_Date__c"),
                "status": rec.get("Status__c"),
                "managerApprovedBy": (rec.get("Manager_Approved_By__r") or {}).get("Name"),
                "managerApprovalDate": rec.get("Manager_Approval_Date__c"),
            })
        
        print(f"[DIRECTOR_APPROVALS] Found {len(approvals)} pending director approvals")
        return {
            "totalPending": len(approvals),
            "approvals": approvals,
            "asOfDate": datetime.now(timezone.utc).date().isoformat()
        }
    except Exception as e:
        print(f"[DIRECTOR_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/director/approve/{record_id}")
def director_approve(record_id: str, approval: ApprovalAction):
    """
    Director approves a request → moves to Finance queue
    """
    try:
        print(f"[DIRECTOR_APPROVALS] Director approving record: {record_id}")
        
        if approval.action == "approve":
            # Update record status to "Pending Finance"
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Pending Finance',
                    Director_Approved_By__c = (SELECT Id FROM User WHERE Email = '{approval.approverEmail}' LIMIT 1),
                    Director_Approval_Date__c = NOW(),
                    Director_Comments__c = '{approval.comment or ""}'
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "success",
                "message": f"Record {record_id} approved by director and moved to Finance",
                "newStatus": "Pending Finance"
            }
        else:
            # Reject - move back to Manager queue
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Manager Approved',
                    Director_Rejection_Reason__c = '{approval.comment or ""}',
                    Director_Rejection_Date__c = NOW()
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "rejected",
                "message": f"Record {record_id} rejected by director",
                "newStatus": "Manager Approved"
            }
    except Exception as e:
        print(f"[DIRECTOR_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Finance Approvals Page ───────────────────────────────────────────────────
# Shows: Director-Approved requests (status: "Pending Finance")

@router.get("/finance/pending")
def get_finance_pending_approvals():
    """
    Returns all requests that have been approved by director
    and are now pending finance approval
    """
    try:
        print("[FINANCE_APPROVALS] Fetching pending finance approvals...")
        
        result = sf_service.execute_soql("""
            SELECT 
                Id,
                Name,
                Description__c,
                Credit_Amount__c,
                Submitted_By__r.Name,
                Submitted_By__r.Email,
                Submitted_Date__c,
                Status__c,
                Manager_Approval_Date__c,
                Manager_Approved_By__r.Name,
                Director_Approval_Date__c,
                Director_Approved_By__r.Name,
                CreatedDate
            FROM Approval_Request__c
            WHERE Status__c = 'Pending Finance'
            ORDER BY Submitted_Date__c DESC
        """) or []
        
        approvals = []
        for rec in result:
            approvals.append({
                "id": rec.get("Id"),
                "name": rec.get("Name"),
                "description": rec.get("Description__c"),
                "creditAmount": rec.get("Credit_Amount__c", 0),
                "submittedBy": (rec.get("Submitted_By__r") or {}).get("Name"),
                "submittedByEmail": (rec.get("Submitted_By__r") or {}).get("Email"),
                "submittedDate": rec.get("Submitted_Date__c"),
                "status": rec.get("Status__c"),
                "managerApprovedBy": (rec.get("Manager_Approved_By__r") or {}).get("Name"),
                "managerApprovalDate": rec.get("Manager_Approval_Date__c"),
                "directorApprovedBy": (rec.get("Director_Approved_By__r") or {}).get("Name"),
                "directorApprovalDate": rec.get("Director_Approval_Date__c"),
            })
        
        print(f"[FINANCE_APPROVALS] Found {len(approvals)} pending finance approvals")
        return {
            "totalPending": len(approvals),
            "approvals": approvals,
            "asOfDate": datetime.now(timezone.utc).date().isoformat()
        }
    except Exception as e:
        print(f"[FINANCE_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finance/approve/{record_id}")
def finance_approve(record_id: str, approval: ApprovalAction):
    """
    Finance team approves a request → marks as complete
    """
    try:
        print(f"[FINANCE_APPROVALS] Finance approving record: {record_id}")
        
        if approval.action == "approve":
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Approved',
                    Finance_Approved_By__c = (SELECT Id FROM User WHERE Email = '{approval.approverEmail}' LIMIT 1),
                    Finance_Approval_Date__c = NOW(),
                    Finance_Comments__c = '{approval.comment or ""}'
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "success",
                "message": f"Record {record_id} approved by finance - COMPLETE",
                "newStatus": "Approved"
            }
        else:
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Pending Finance',
                    Finance_Rejection_Reason__c = '{approval.comment or ""}',
                    Finance_Rejection_Date__c = NOW()
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "rejected",
                "message": f"Record {record_id} rejected by finance",
                "newStatus": "Pending Finance"
            }
    except Exception as e:
        print(f"[FINANCE_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Manager Approvals Page ───────────────────────────────────────────────────
# Shows: Submitted requests (status: "Pending Manager")

@router.get("/manager/pending")
def get_manager_pending_approvals():
    """
    Returns all requests >= 500 that need manager approval
    """
    try:
        print("[MANAGER_APPROVALS] Fetching pending manager approvals...")
        
        result = sf_service.execute_soql("""
            SELECT 
                Id,
                Name,
                Description__c,
                Credit_Amount__c,
                Submitted_By__r.Name,
                Submitted_By__r.Email,
                Submitted_Date__c,
                Status__c,
                CreatedDate
            FROM Approval_Request__c
            WHERE Status__c = 'Pending Manager'
              AND Credit_Amount__c >= 500
            ORDER BY Submitted_Date__c DESC
        """) or []
        
        approvals = []
        for rec in result:
            approvals.append({
                "id": rec.get("Id"),
                "name": rec.get("Name"),
                "description": rec.get("Description__c"),
                "creditAmount": rec.get("Credit_Amount__c", 0),
                "submittedBy": (rec.get("Submitted_By__r") or {}).get("Name"),
                "submittedByEmail": (rec.get("Submitted_By__r") or {}).get("Email"),
                "submittedDate": rec.get("Submitted_Date__c"),
                "status": rec.get("Status__c"),
            })
        
        print(f"[MANAGER_APPROVALS] Found {len(approvals)} pending manager approvals")
        return {
            "totalPending": len(approvals),
            "approvals": approvals,
            "asOfDate": datetime.now(timezone.utc).date().isoformat()
        }
    except Exception as e:
        print(f"[MANAGER_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/manager/approve/{record_id}")
def manager_approve(record_id: str, approval: ApprovalAction):
    """
    Manager approves a request → moves to Director queue
    """
    try:
        print(f"[MANAGER_APPROVALS] Manager approving record: {record_id}")
        
        if approval.action == "approve":
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Pending Director',
                    Manager_Approved_By__c = (SELECT Id FROM User WHERE Email = '{approval.approverEmail}' LIMIT 1),
                    Manager_Approval_Date__c = NOW(),
                    Manager_Comments__c = '{approval.comment or ""}'
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "success",
                "message": f"Record {record_id} approved by manager and moved to Director",
                "newStatus": "Pending Director"
            }
        else:
            sf_service.execute_soql(f"""
                UPDATE Approval_Request__c 
                SET Status__c = 'Rejected',
                    Manager_Rejection_Reason__c = '{approval.comment or ""}',
                    Manager_Rejection_Date__c = NOW()
                WHERE Id = '{record_id}'
            """)
            
            return {
                "status": "rejected",
                "message": f"Record {record_id} rejected by manager",
                "newStatus": "Rejected"
            }
    except Exception as e:
        print(f"[MANAGER_APPROVALS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
