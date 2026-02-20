# -*- coding: utf-8 -*-
import os
import glob

backend_dir = r"c:\Users\Kunguma.Balaji\Downloads\FLEET-FULL-STACK--main (1)\FLEET-FULL-STACK--main\backend"

# Files to fix
files_to_fix = [
    os.path.join(backend_dir, "app.py"),
    os.path.join(backend_dir, "app_refactored.py"),
    os.path.join(backend_dir, "webfleet_api.py"),
    os.path.join(backend_dir, "salesforce_service.py"),
    os.path.join(backend_dir, "groq_service.py"),
    os.path.join(backend_dir, "routes", "ai.py"),
    os.path.join(backend_dir, "routes", "chat.py"),
    os.path.join(backend_dir, "routes", "webfleet.py"),
]

for filepath in files_to_fix:
    if os.path.exists(filepath):
        try:
            with open(filepath, 'rb') as f:
                content_bytes = f.read()
            
            # Remove BOM if present
            if content_bytes.startswith(b'\xef\xbb\xbf'):
                content_bytes = content_bytes[3:]
            
            # Decode and re-encode as UTF-8 without BOM
            try:
                content = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                content = content_bytes.decode('latin-1')
            
            # Write back without BOM
            with open(filepath, 'wb') as f:
                f.write(content.encode('utf-8'))
            
            print(f"Fixed: {os.path.basename(filepath)}")
        except Exception as e:
            print(f"Error fixing {filepath}: {e}")
    else:
        print(f"Not found: {filepath}")

print("BOM removal complete!")
