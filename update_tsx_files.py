#!/usr/bin/env python3
import re

# Read the generated lease data
with open('lease_data.ts', 'r', encoding='utf-8') as f:
    lease_data_content = f.read()

# Convert to TypeScript format (change double quotes to single quotes for consistency)
ts_content = lease_data_content.replace('"', "'")

# Fix the quote conversion for now - keep as is for now
ts_content = lease_data_content

# Read root HSBCLeases.tsx
with open('src/pages/HSBCLeases.tsx', 'r', encoding='utf-8') as f:
    root_content = f.read()

# Read frontend HSBCLeases.tsx
with open('frontend/src/pages/HSBCLeases.tsx', 'r', encoding='utf-8') as f:
    frontend_content = f.read()

# Find and replace the leaseData array in both files
# Pattern: from "const leaseData: Lease[] = [" to the closing "];"

pattern = r'(// Hardcoded lease data\s+const leaseData: Lease\[\] = \[).*?(\];)'

# Create the new leaseData definition
new_lease_data = f'''// Hardcoded lease data
{lease_data_content}'''

# Replace in root file
root_updated = re.sub(pattern, new_lease_data, root_content, flags=re.DOTALL)

# Replace in frontend file
frontend_updated = re.sub(pattern, new_lease_data, frontend_content, flags=re.DOTALL)

# Write back
with open('src/pages/HSBCLeases.tsx', 'w', encoding='utf-8') as f:
    f.write(root_updated)

with open('frontend/src/pages/HSBCLeases.tsx', 'w', encoding='utf-8') as f:
    f.write(frontend_updated)

print("✅ Successfully updated both HSBCLeases.tsx files with complete lease data")
print("   - Root: src/pages/HSBCLeases.tsx")
print("   - Frontend: frontend/src/pages/HSBCLeases.tsx")
