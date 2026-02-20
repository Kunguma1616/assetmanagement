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
        
        # Check if file starts with BOM
        if raw_bytes.startswith(b'\xef\xbb\xbf'):
            # Remove BOM (first 3 bytes)
            content_bytes = raw_bytes[3:]
            print(f"[BOM] {os.path.relpath(filepath, backend_dir)}")
            
            # Write back without BOM
            with open(filepath, 'wb') as f:
                f.write(content_bytes)
        else:
            # Try to detect and remove any other encoding issues
            try:
                content = raw_bytes.decode('utf-8')
            except UnicodeDecodeError:
                content = raw_bytes.decode('utf-8', errors='ignore')
            
            # Write back clean UTF-8
            with open(filepath, 'wb') as f:
                f.write(content.encode('utf-8'))
            
    except Exception as e:
        print(f"[ERROR] {os.path.relpath(filepath, backend_dir)}: {e}")

print("\nDone! All BOM characters removed.")
