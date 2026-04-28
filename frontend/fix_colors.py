# -*- coding: utf-8 -*-
import os

file_path = r"c:\Users\Kunguma.Balaji\Downloads\FLEET-FULL-STACK--main (1)\FLEET-FULL-STACK--main\frontend\src\pages\FleetDashboard.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all the gray colors with black/dark colors
replacements = {
    "color: '#646F86'": "color: '#000000'",
    "color: '#1A1D23'": "color: '#000000'",
    "color: '#323843'": "color: '#000000'",
    "color: '#848EA3'": "color: '#666666'",
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard colors updated successfully!")
