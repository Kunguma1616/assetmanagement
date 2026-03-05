# Trade-Based Access Restriction Implementation

## Overview
This implementation adds trade-based access restrictions to the Webfleet (Engineer Performance) and VCR (Vehicle Condition Report) pages. Users with trade restrictions will only see data relevant to their assigned trade group.

---

## How It Works

### User Authentication Flow
1. User logs in via Microsoft OAuth
2. Backend (auth.py) returns user's trade via URL parameter
3. Frontend stores data in `sessionStorage` under `user_data`:
```json
{
  "name": "Peter Raynsford",
  "email": "peter@example.com", 
  "session": "session_token_here",
  "trade": "LDR"  // "ALL" means no restriction
}
```

### Trade Mapping
From `auth.py`, the allowed users are:
- **No restriction (trade: null)**: Alex Bacon, Aman Bisht, Amandeep Singh, etc.
- **LDR**: Peter Raynsford, Marjan Kola
- **Building Fabric**: Lee Merryweather
- **HVAC & Electrical**: James Parkinson
- **Drainage & Plumbing**: Martin Mackie
- **Fire Safety**: Paul McGee

---

## Files Modified

### 1. New File: `frontend/src/hooks/useUserTrade.ts`
Custom React hook that retrieves and manages user's trade from sessionStorage.

**Functions:**
- `useUserTrade()` - Hook that returns:
  - `userTrade`: User's trade string (e.g., "LDR", "ALL")
  - `userName`: User's name
  - `isLoading`: Boolean indicating data loading state
  - `showsAllTrades()`: Returns true if user has no restriction
  - `canViewTrade(itemTrade)`: Returns true if item's trade matches user's restricted trade

```typescript
const { userTrade, userName, showsAllTrades, canViewTrade } = useUserTrade();
```

---

### 2. Modified: `frontend/src/pages/webfleet.tsx`
**Changes:**
- Imported `useUserTrade` hook
- Added `Lock` icon from lucide-react
- Integrated trade-based filtering:
  - Auto-selects user's trade group if restricted
  - Filters engineer list to show only user's trade
  - Disables trade group dropdown if user has restriction
  - Shows lock badge "LDR Only" when restricted
  - Displays restriction info in header with badge

**Key Points:**
- Trade restriction is applied in `fetchEngineers()` function
- Dropdown is disabled and styling changed if restriction exists
- Lock icon indicates restricted access

---

### 3. Modified: `frontend/src/pages/vehicleCondition.tsx`
**Changes:**
- Imported `useUserTrade` hook
- Added `Lock` icon from lucide-react
- Integrated trade-based filtering:
  - Auto-sets trade group filter to user's trade if restricted
  - Hides vehicles from other trades
  - Disables trade group dropdown if user has restriction
  - Shows lock badge in filter section
  - Displays restriction info in header with warning styling

**Key Points:**
- Trade restriction is applied via `setTradeGroupFilter(userTrade)` in `useEffect`
- Data filtering happens in existing filter logic
- Dropdown styling changes to indicate restriction

---

## Visual Indicators

### When User Has Trade Restriction:

**Webfleet Page:**
- Header shows: `🔒 LDR Only` (with lock icon in semi-transparent badge)
- Trade filter dropdown:
  - Background changes to orange-tinted
  - Border becomes orange
  - Dropdown is disabled (cursor: not-allowed)
  - Shows badge: `🔒 LDR Only`

**VCR Dashboard:**
- Header shows: `🔒 Viewing LDR only` (orange/warning styling)
- Trade filter dropdown:
  - Background changes to orange-tinted
  - Border becomes orange
  - Dropdown is disabled
  - Shows badge: `🔒 LDR Only`

---

## User Scenarios

### Scenario 1: Peter Raynsford (trade: "LDR")
- Logs in via Microsoft OAuth
- `sessionStorage.user_data.trade` = "LDR"
- Webfleet page:
  - Shows ONLY engineers with trade_group = "LDR"
  - Trade filter dropdown is disabled
  - Shows lock badge indicating restriction
- VCR Dashboard:
  - Shows ONLY vehicles assigned to LDR engineers
  - Trade filter dropdown is disabled
  - Shows lock badge indicating restriction

### Scenario 2: Alex Bacon (trade: null/"ALL")
- Logs in via Microsoft OAuth
- `sessionStorage.user_data.trade` = "ALL"
- Webfleet page:
  - Shows ALL engineers from all trades
  - Trade filter dropdown is ENABLED and fully functional
  - No lock badges or restrictions visible
- VCR Dashboard:
  - Shows ALL vehicles from all trades
  - Trade filter dropdown is ENABLED
  - No lock badges or restrictions visible

---

## Backend Requirements

The backend (`backend/routes/auth.py`) already includes the implementation:

```python
ALLOWED_USERS = {
    "48e4b779-7878-4d05-a8b1-126397391de4": {
        "name": "Peter Raynsford", 
        "trade": "LDR"  # Trade restriction
    },
    "1f7e5c0e-77a3-46f4-8650-8e8537248e19": {
        "name": "Kunguma Balaji",
        "trade": None  # No restriction - see all
    },
}
```

The OAuth callback redirects with trade info:
```
https://frontend/?user=Peter%20Raynsford&email=...&session=...&trade=LDR
```

---

## Testing

### Test Case 1: Restricted User (Peter Raynsford)
1. Log in as Peter Raynsford
2. Navigate to Webfleet page
3. Verify:
   - ✅ Lock badge shows "LDR Only"
   - ✅ Only engineers with LDR trade visible
   - ✅ Trade dropdown is disabled
   - ✅ Dropdown shows orange styling
   - ✅ Cannot change trade filter

4. Navigate to VCR Dashboard
5. Verify:
   - ✅ Lock badge shows "Viewing LDR only"
   - ✅ Only LDR vehicles visible
   - ✅ Trade dropdown is disabled
   - ✅ Dropdown shows orange styling

### Test Case 2: Unrestricted User (Kunguma Balaji)
1. Log in as Kunguma Balaji
2. Navigate to Webfleet page
3. Verify:
   - ✅ NO lock badges
   - ✅ All engineers visible
   - ✅ Trade dropdown is enabled
   - ✅ Standard blue styling
   - ✅ Can change trade filter freely

4. Navigate to VCR Dashboard
5. Verify:
   - ✅ NO lock badges
   - ✅ All vehicles visible
   - ✅ Trade dropdown is enabled
   - ✅ Standard blue styling

---

## Browser Storage

User data is stored in `sessionStorage` (not `localStorage`):
- **Key**: `user_data`
- **Value**: JSON object with user details including trade
- **Scope**: Session only (cleared when browser closes)
- **Accessed by**: `useUserTrade` hook on component mount

---

## Technical Notes

1. **Trade Values**:
   - `"ALL"` or `null` = No restriction (user sees all data)
   - Any other string (e.g., "LDR", "HVAC & Electrical") = Restricted to that trade only

2. **Filtering Strategy**:
   - Data is filtered on the frontend (no API changes required)
   - Hook provides utility functions for easy filtering
   - Existing backend queries fetch all data; filtering is done client-side

3. **UI State**:
   - Dropdown is disabled but still shows current value
   - Styling provides visual feedback of restriction
   - No error states needed - restriction is enforced automatically

4. **Future Enhancements**:
   - Could add server-side filtering for performance with large datasets
   - Could add audit logging for restricted data access
   - Could add dynamic trade group updates without page reload

---

## Example Implementation Pattern

To use this in other components:

```tsx
import { useUserTrade } from '@/hooks/useUserTrade';

export function MyComponent() {
  const { userTrade, showsAllTrades, canViewTrade } = useUserTrade();
  
  // Filter data
  const filteredData = allData.filter(item => 
    canViewTrade(item.tradeGroup)
  );
  
  // Show restriction badge
  if (!showsAllTrades()) {
    return <div>Restricted to {userTrade} trade</div>;
  }
  
  return <div>Viewing all trades</div>;
}
```

---

## Summary

✅ Trade-based access restriction successfully implemented
✅ Webfleet page filters engineers by user's trade
✅ VCR Dashboard filters vehicles by user's trade
✅ UI provides clear visual feedback of restrictions
✅ User cannot override restrictions via UI
✅ Unrestricted users see full functionality
✅ No breaking changes to existing features
