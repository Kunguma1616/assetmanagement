# Integration Guide for Lease Data API

## Quick Start

Add the lease routes to your FastAPI app by including this import and registration in `backend/app.py`:

### Step 1: Add Import

In `app.py`, add this import with the other route imports:

```python
from routes.leases import router as leases_router
```

Find the line where other routers are imported (around line 24), and add:
```python
from routes.leases import router as leases_router  # Add this line
```

### Step 2: Register Router

After the existing `app.include_router()` calls (around line 70+), add:

```python
# Include lease routes
app.include_router(leases_router)
```

### Complete Example

Here's what the relevant section of app.py should look like:

```python
from routes.dashboard import router as dashboard_router
from routes.assetdashboad import router as asset_dashboard_router
from routes.Asset_allocation import router as allocation_router
from routes.Asset_cost import router as asset_cost_router
from routes.Assetpercost import router as asset_per_cost_router
from routes.webfleet import router as webfleet_router, load_engineers_with_scores, start_scheduler
from routes.vehicles import router as vehicles_router
from routes.assets import router as assets_router
from routes.ai import router as ai_router
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.uploadvehicle import router as upload_router
from routes.cost import router as cost_router
from routes.vehicle_condition import router as vehicle_condition_router
from routes.register_asset import router as register_asset_router
from routes.leases import router as leases_router  # ADD THIS LINE

# ... rest of app setup ...

# Include all routers
app.include_router(dashboard_router)
app.include_router(asset_dashboard_router)
app.include_router(allocation_router)
app.include_router(asset_cost_router)
app.include_router(asset_per_cost_router)
app.include_router(webfleet_router)
app.include_router(vehicles_router)
app.include_router(assets_router)
app.include_router(ai_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(cost_router)
app.include_router(vehicle_condition_router)
app.include_router(register_asset_router)
app.include_router(leases_router)  # ADD THIS LINE
```

## API Endpoints

After adding the router, you'll have access to these endpoints:

### 1. Get All Leases
```
GET /api/leases
```
Returns all 174 lease records with all columns.

**Response:**
```json
{
  "success": true,
  "count": 174,
  "data": [
    {
      "Identifier": "HSBC 15",
      "Type": "Motor Vehicle",
      "Net Capital": 1512.0,
      "Capital Cost": 79690.83,
      "Total Repayment": 82443.74,
      ...
    }
  ]
}
```

### 2. Get Lease by Identifier
```
GET /api/leases/identifier/HSBC 15
```
Returns all records for a specific identifier.

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [{ ... }]
}
```

### 3. Get Leases by Type
```
GET /api/leases/type/Motor Vehicle
```
or
```
GET /api/leases/type/Equipment
```

**Response:**
```json
{
  "success": true,
  "count": 149,
  "data": [{ ... }]
}
```

### 4. Get Financial Summary
```
GET /api/leases/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_records": 174,
    "motor_vehicles": 149,
    "equipment": 25,
    "total_net_capital": 4979599.47,
    "total_capital_cost": 14080678.17,
    "total_repayment": 23303901.13,
    "avg_net_capital": 28618.39,
    "avg_capital_cost": 80923.44,
    "avg_repayment": 133930.47
  }
}
```

### 5. Get Statistics by Type
```
GET /api/leases/stats/by-type
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Motor Vehicle": {
      "count": 149,
      "total_capital": 12327094.87,
      "total_repayment": 19901506.17,
      "avg_capital": 82735.30,
      "avg_repayment": 133567.29
    },
    "Equipment": {
      "count": 25,
      "total_capital": 1753583.30,
      "total_repayment": 3402394.96,
      "avg_capital": 70143.33,
      "avg_repayment": 136095.80
    }
  }
}
```

### 6. Search Leases
```
GET /api/leases/search?identifier=HSBC&lease_type=Motor Vehicle&registration=Renault
```

**Parameters:**
- `identifier` (optional): Filter by identifier (substring match, case-insensitive)
- `lease_type` (optional): Filter by type ('Motor Vehicle' or 'Equipment')
- `registration` (optional): Filter by registration/model (substring match, case-insensitive)

### 7. Health Check
```
GET /api/leases/health
```

**Response:**
```json
{
  "status": "healthy",
  "records_available": 174,
  "columns_available": 20
}
```

## Testing the API

Once the router is added and your FastAPI server is running:

### 1. Using curl
```bash
# Get all leases
curl http://localhost:8000/api/leases

# Get specific identifier
curl http://localhost:8000/api/leases/identifier/HSBC%2015

# Get by type
curl http://localhost:8000/api/leases/type/Motor%20Vehicle

# Get summary
curl http://localhost:8000/api/leases/summary

# Search
curl "http://localhost:8000/api/leases/search?identifier=HSBC&lease_type=Motor%20Vehicle"
```

### 2. Using Python requests
```python
import requests

BASE_URL = "http://localhost:8000/api/leases"

# Get all leases
response = requests.get(f"{BASE_URL}")
leases = response.json()

# Get specific identifier
response = requests.get(f"{BASE_URL}/identifier/HSBC%2015")
hsbc_15 = response.json()

# Get summary
response = requests.get(f"{BASE_URL}/summary")
summary = response.json()

print(summary['data']['total_net_capital'])
```

### 3. Using FastAPI docs
Once your server is running, visit:
```
http://localhost:8000/docs
```

This will show the interactive Swagger UI with all endpoints documented and testable!

## File Structure

```
backend/
├── app.py                      (Main FastAPI app - ADD IMPORT HERE)
├── excel_handler.py            (Core Excel processing)
├── lease_data_helper.py        (High-level API helpers)
├── routes/
│   ├── leases.py              (NEW - Lease API routes)
│   ├── dashboard.py
│   ├── assets.py
│   └── ... (other routes)
```

## Troubleshooting

### Import Error: "No module named 'lease_data_helper'"
Make sure you're in the `backend` directory and the module is in the same directory as `app.py`.

### FileNotFoundError: "HSBC_Leases.xlsx not found"
Ensure `HSBC_Leases.xlsx` is in the root project directory (parent of `backend/`).

### 404 on /api/leases
Make sure you've:
1. Added the import in `app.py`
2. Called `app.include_router(leases_router)`
3. Restarted the FastAPI server

## Performance Notes

- First call may take 1-2 seconds (Excel processing)
- Subsequent calls are fast
- Consider adding caching for production use
- Handles 174 records efficiently

## Next Steps

To optimize for production:

1. **Add caching** - Avoid re-reading Excel on every request
2. **Add error logging** - Log exceptions for debugging
3. **Add database** - Store cleaned data in database instead of reading Excel
4. **Add pagination** - For endpoints returning many records
5. **Add rate limiting** - Prevent abuse
