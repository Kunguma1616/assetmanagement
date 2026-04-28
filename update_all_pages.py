import os
import re
from pathlib import Path

# Color definitions
color_object = """const colors = {
  primary: { default: '#27549D', light: '#7099DB', darker: '#17325E', subtle: '#F7F9FD' },
  brand: { yellow: '#F1FF24' },
  support: { green: '#2EB844', orange: '#F29630', red: '#D15134' },
  grayscale: { title: '#1A1D23', body: '#323843', subtle: '#646F86', caption: '#848EA3', negative: '#F3F4F6', border: '#CDD1DA' },
};"""

pages_to_update = [
    'frontend/src/pages/Assets.tsx',
    'frontend/src/pages/AssetDetail.tsx',
    'frontend/src/pages/VehicleLookup.tsx',
    'frontend/src/pages/webfleet.tsx',
    'frontend/src/pages/vehicleCondition.tsx',
    'frontend/src/pages/FleetDashboard.tsx',
]

replacements = [
    ('#F3F4F6', 'colors.grayscale.negative'),
    ('#27549D', 'colors.primary.default'),
    ('#F1FF24', 'colors.brand.yellow'),
    ('#D15134', 'colors.support.red'),
    ('#2EB844', 'colors.support.green'),
    ('#F29630', 'colors.support.orange'),
    ('#1A1D23', 'colors.grayscale.title'),
    ('#323843', 'colors.grayscale.body'),
    ('#646F86', 'colors.grayscale.subtle'),
    ('#848EA3', 'colors.grayscale.caption'),
    ('#CDD1DA', 'colors.grayscale.border'),
    ('#17325E', 'colors.primary.darker'),
    ('#7099DB', 'colors.primary.light'),
    ('#F7F9FD', 'colors.primary.subtle'),
]

print("✅ Ready to update all pages")
print(f"Total pages to update: {len(pages_to_update)}")
print("\nNote: Ensure all .tsx files have the color object defined at the top")
print("Run this script in the root project directory\n")
