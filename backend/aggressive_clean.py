# -*- coding: utf-8 -*-
import os
import glob

backend_dir = r"c:\Users\Kunguma.Balaji\Downloads\FLEET-FULL-STACK--main (1)\FLEET-FULL-STACK--main\backend"

# Get all Python files recursively
py_files = glob.glob(os.path.join(backend_dir, "**", "*.py"), recursive=True)

print(f"Found {len(py_files)} Python files to process")

for filepath in py_files:
    try:
        with open(filepath, 'rb') as f:
            raw_bytes = f.read()
        
        # Remove ALL BOM characters
        clean_bytes = raw_bytes.replace(b'\xef\xbb\xbf', b'')
        
        # Also try to remove any other problematic characters
        try:
            content = clean_bytes.decode('utf-8')
        except UnicodeDecodeError:
            content = clean_bytes.decode('utf-8', errors='ignore')
        
        # Write back clean
        with open(filepath, 'wb') as f:
            f.write(content.encode('utf-8'))
        
        if clean_bytes != raw_bytes:
            print(f"[CLEANED] {os.path.relpath(filepath, backend_dir)}")
            
    except Exception as e:
        print(f"[ERROR] {os.path.relpath(filepath, backend_dir)}: {e}")

print("\nDone! All encoding issues fixed.")
