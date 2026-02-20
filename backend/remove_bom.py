# -*- coding: utf-8 -*-
import os
import glob

backend_dir = r"c:\Users\Kunguma.Balaji\Downloads\FLEET-FULL-STACK--main (1)\FLEET-FULL-STACK--main\backend"

# Find all Python files
python_files = glob.glob(os.path.join(backend_dir, "**", "*.py"), recursive=True)

print(f"Found {len(python_files)} Python files to check")

for filepath in python_files:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        
        # Check if file has BOM
        if content.startswith(b'\xef\xbb\xbf'):
            print(f"Removing BOM from: {filepath}")
            # Remove BOM and rewrite
            content = content[3:]
            with open(filepath, 'wb') as f:
                f.write(content)
            print(f"  [OK] BOM removed")
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

print("All files cleaned!")
