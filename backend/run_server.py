#!/usr/bin/env python
"""
Simple backend server startup script with port fallback
"""
import subprocess
import socket
import sys
import time

def is_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return True
        except OSError:
            return False

def find_available_port(start_port=8000, max_port=8010):
    """Find an available port starting from start_port"""
    for port in range(start_port, max_port):
        if is_port_available(port):
            return port
    return None

def main():
    # Kill any existing processes on port 8000
    import os
    if sys.platform.startswith('win'):
        os.system('taskkill /F /IM python.exe 2>nul')
        time.sleep(2)
    
    # Find available port
    port = find_available_port()
    if port is None:
        print("❌ ERROR: No available ports found (8000-8009)")
        sys.exit(1)
    
    print(f"🚀 Starting server on port {port}...")
    
    if port != 8000:
        print(f"⚠️  NOTE: Port 8000 was in use, using port {port} instead")
        print(f"   Update your frontend REACT_APP_API_URL to http://localhost:{port}")
    
    # Start the server
    import uvicorn
    from app import app
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

if __name__ == "__main__":
    main()
