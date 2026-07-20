"""
Manual Registration Script for Cybergate
========================================
Gunakan script ini untuk mendaftarkan aplikasi ke Cybergate secara manual
jika registrasi otomatis saat startup gagal.
"""

import sys
import os
import argparse
import requests

# Add parent directory to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cybergate_app_config import APP_REGISTRATION_PAYLOAD

def register(cybergate_url, api_secret):
    api_endpoint = f"{cybergate_url.rstrip('/')}/admin/apps"
    
    print(f"Mendaftarkan ke Cybergate: {APP_REGISTRATION_PAYLOAD['name']}")
    print(f"Endpoint: {api_endpoint}")
    
    headers = {
        "Content-Type": "application/json",
    }
    if api_secret:
        headers["X-API-Secret"] = api_secret

    try:
        resp = requests.post(
            api_endpoint,
            json=APP_REGISTRATION_PAYLOAD,
            headers=headers,
            timeout=10
        )
        
        if resp.status_code in (200, 201):
            print("✅ Registrasi berhasil!")
            print(resp.json())
        else:
            print(f"❌ Registrasi gagal: HTTP {resp.status_code}")
            print(resp.text)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register app to Cybergate")
    parser.add_argument(
        "--cybergate-url", 
        default=os.getenv("CYBERGATE_HOST", "http://localhost:5000"),
        help="URL Cybergate Portal"
    )
    parser.add_argument(
        "--api-secret", 
        default=os.getenv("CYBERGATE_API_SECRET", ""),
        help="Cybergate API Secret"
    )
    
    args = parser.parse_args()
    register(args.cybergate_url, args.api_secret)