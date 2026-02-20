# -*- coding: utf-8 -*-
import os
import re

files_to_fix = [
    'app.py',
    'app_refactored.py',
    'webfleet_api.py',
    'salesforce_service.py',
    'groq_service.py',
    'routes/ai.py'
]

for filepath in files_to_fix:
    if os.path.exists(filepath):
        try:
            with open(filepath, 'rb') as f:
                content_bytes = f.read()
            
            # Try to decode as UTF-8, fallback to latin-1
            try:
                content = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                content = content_bytes.decode('latin-1')
            
            # Replace emoji characters with text equivalents
            replacements = {
                '✅': '[OK]',
                '⚠️': '[WARNING]',
                '🚀': '[LAUNCH]',
                '🔍': '[SEARCH]'
            }
            
            for emoji, replacement in replacements.items():
                content = content.replace(emoji, replacement)
            
            # Add UTF-8 encoding declaration if not present
            if not content.startswith('# -*- coding: utf-8 -*-'):
                content = '# -*- coding: utf-8 -*-\n' + content
            
            # Write back as UTF-8
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"Fixed: {filepath}")
        except Exception as e:
            print(f"Error fixing {filepath}: {e}")
    else:
        print(f"File not found: {filepath}")

print("Encoding fix complete!")
