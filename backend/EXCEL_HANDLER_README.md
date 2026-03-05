# HSBC Leases Data Handler - Documentation

## Overview

This solution provides Python utilities to read, clean, and process HSBC lease data from Excel files. It handles merged cells, cleans currency columns, and provides helper functions for API endpoints.

## Features

✓ **Handles Merged Cells**: Uses openpyxl to detect merged cells and forward-fills values
✓ **Currency Cleaning**: Automatically removes £ symbols and commas from monetary values
✓ **Type Conversion**: Converts cleaned currency columns to numeric (float) types
✓ **Easy Integration**: Provides simple helper functions for Flask API endpoints
✓ **No External Data Loss**: Preserves all data while cleaning only what's necessary

## Files

### 1. `excel_handler.py`
Core module for reading and cleaning Excel files.

**Key Functions:**
- `clean_currency_column(value)` - Converts currency strings to float
- `unmerge_cells_forward_fill(df, file_path)` - Handles merged cells with forward fill
- `read_and_clean_hsbc_leases(file_path, sheet_name='Leases', verbose=True)` - Main function

**Example Usage:**
```python
from excel_handler import read_and_clean_hsbc_leases

# Read and clean Excel file
df = read_and_clean_hsbc_leases('HSBC_Leases.xlsx')

# Use the cleaned DataFrame
print(df.head())
print(df.dtypes)
```

### 2. `lease_data_helper.py`
High-level API helper functions for Flask integration.

**Key Functions:**
- `get_lease_data(file_path=None, as_dict=False)` - Load all lease data
- `get_lease_by_identifier(identifier)` - Get leases by ID (e.g., 'HSBC 15')
- `get_leases_by_type(lease_type)` - Get leases by type (Motor Vehicle or Equipment)
- `get_financial_summary()` - Get financial metrics and totals

**Example Usage:**
```python
from lease_data_helper import (
    get_lease_data,
    get_lease_by_identifier,
    get_financial_summary
)

# Load all leases as DataFrame
df = get_lease_data()

# Load all leases as list of dictionaries
leases = get_lease_data(as_dict=True)

# Get specific lease
hsbc_15 = get_lease_by_identifier('HSBC 15')

# Get financial summary
summary = get_financial_summary()
print(f"Total Net Capital: £{summary['total_net_capital']:,.2f}")
```

## Integration with Flask

### Basic API Endpoints

Add these endpoints to your `app.py`:

```python
from flask import Flask, jsonify, request
from lease_data_helper import (
    get_lease_data,
    get_lease_by_identifier,
    get_leases_by_type,
    get_financial_summary
)

app = Flask(__name__)

# Get all leases
@app.route('/api/leases', methods=['GET'])
def get_all_leases():
    try:
        data = get_lease_data(as_dict=True)
        return jsonify({
            'success': True,
            'count': len(data),
            'data': data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Get leases by identifier
@app.route('/api/lease/<identifier>', methods=['GET'])
def get_lease(identifier):
    try:
        df = get_lease_by_identifier(identifier)
        if len(df) == 0:
            return jsonify({
                'success': False,
                'error': f'No lease found: {identifier}'
            }), 404
        
        return jsonify({
            'success': True,
            'count': len(df),
            'data': df.to_dict('records')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Get leases by type
@app.route('/api/leases/type/<lease_type>', methods=['GET'])
def get_leases(lease_type):
    try:
        df = get_leases_by_type(lease_type)
        return jsonify({
            'success': True,
            'count': len(df),
            'data': df.to_dict('records')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Get financial summary
@app.route('/api/summary', methods=['GET'])
def get_summary():
    try:
        summary = get_financial_summary()
        return jsonify({
            'success': True,
            'data': summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
```

## Data Cleaning Details

### Currency Columns Processed

The following columns are automatically cleaned:
- Net Capital
- VAT on Acquisition
- Capital Cost
- Arrangement Fee
- Finance Interest
- Initial Payment
- Monthly Installment
- Final Payment
- Total Repayment
- RFL
- Check

### Processing Steps

1. **Headers Cleaned**: Whitespace trimmed from column names
2. **Merged Cells Handled**: Forward fill used to populate missing values
3. **Currency Symbols Removed**: £ symbols and commas removed
4. **Type Conversion**: Values converted to float64
5. **Empty Columns Dropped**: Unnamed and completely empty columns removed
6. **Empty Rows Removed**: Rows with all NaN values removed

### Example Output

Before:
```
Identifier  | Net Capital | Total Repayment
HSBC 15     | £1,512.00   | £82,443.74
HSBC 2      | NaN         | £0.00
```

After:
```
Identifier  | Net Capital | Total Repayment
HSBC 15     | 1512.0      | 82443.74
HSBC 2      | 1512.0      | 0.0
```

## Column Information

### Available Columns After Cleaning

- `Identifier` - Lease identifier (e.g., HSBC 15)
- `Type` - Motor Vehicle or Equipment
- `Contract number` - Contract ID
- `Registration Doc` - Vehicle registration
- `Identifier for schedule` - Schedule identifier
- `Make and Model` - Vehicle/Equipment model
- `Agreement Start Date` - Start date
- `Agreement term (months)` - Term in months (numeric)
- `Agreement end date` - End date
- `Net Capital` - Net capital amount (£) → float64
- `VAT on Acquisition` - VAT amount (£) → float64
- `RFL` - RFL amount (£) → float64
- `Capital Cost` - Capital cost (£) → float64
- `Arrangement Fee` - Arrangement fee (£) → float64
- `Finance Interest` - Finance interest (£) → float64
- `Initial Payment` - Initial payment (£) → float64
- `Monthly Installment` - Monthly payment (£) → float64
- `Final Payment` - Final payment (£) → float64
- `Total Repayment` - Total repayment (£) → float64
- `Check` - Check amount (£) → float64

## Financial Summary Output

The `get_financial_summary()` function returns:

```json
{
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
```

## Testing

### Run Excel Handler Directly
```bash
cd backend
python excel_handler.py
```

This will:
- Load and clean the Excel file
- Display processing steps
- Print first 10 rows
- Show data types
- Generate summary statistics
- Save cleaned data to `HSBC_Leases_Cleaned.csv`

### Test Helper Functions
```bash
python lease_data_helper.py
```

This will test all helper functions and display results.

### Quick Test
```bash
python -c "from lease_data_helper import get_financial_summary; s = get_financial_summary(); print(s)"
```

## Performance Notes

- File size: ~175 rows × 20 columns
- Processing time: <1 second
- Memory usage: Minimal (< 5MB)
- Caching: Currently loads fresh on each call (can be optimized with caching)

## Troubleshooting

### FileNotFoundError
Ensure `HSBC_Leases.xlsx` is in the root project folder or adjust the path in `get_lease_data()`.

### UnicodeError
The code handles Unicode properly, but ensure Python is configured for UTF-8 encoding.

### Permission Error
Make sure you have read access to the Excel file and write access to the backend directory (for CSV export).

## Future Enhancements

- [ ] Add caching (lru_cache) to avoid re-reading file
- [ ] Add filtering options (date range, price range)
- [ ] Add pagination for large result sets
- [ ] Add CSV export endpoint
- [ ] Add error logging
- [ ] Add data validation checks

## Requirements

```
pandas>=1.3.0
openpyxl>=3.6.0
```

Install with:
```bash
pip install pandas openpyxl
```

## License

Internal use only - HSBC Fleet Management System
