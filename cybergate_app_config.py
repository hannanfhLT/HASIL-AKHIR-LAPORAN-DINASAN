"""
Cybergate App Configuration — HASIL AKHIR LAPORAN DINASAN
========================================================
File konfigurasi untuk integrasi aplikasi dengan Cybergate portal.
"""

# ======================================================================
# METADATA APLIKASI
# ======================================================================
APP_REGISTRATION_PAYLOAD = {
    "name": "CONVERTER LAPORAN DINASAN",
    "description": "Tool untuk konversi mentahan laporan Excel menjadi format laporan dinasan (NOC/SA) secara otomatis",
    "url": "http://localhost:5004",
    "internal_url": "http://laporan-dinasan:5004",
    "icon": "fa-file-signature",
    "order": 3,
    "is_active": True,
}

# ======================================================================
# KONFIGURASI ENVIRONMENT VARIABLES
# ======================================================================
REQUIRED_ENV_VARS = {
    "CYBERGATE_ENABLED": {
        "value": "1",
        "description": "Aktifkan integrasi Cybergate (1=aktif, 0=nonaktif)",
    },
    "CYBERGATE_HOST": {
        "value": "http://cybergate-web:5000",
        "description": "URL host Cybergate portal",
    },
    "CYBERGATE_APP_NAME": {
        "value": "CONVERTER LAPORAN DINASAN",
        "description": "Nama aplikasi yang tampil di portal",
    },
    "CYBERGATE_APP_DESCRIPTION": {
        "value": "Tool untuk konversi mentahan laporan Excel menjadi format laporan dinasan (NOC/SA) secara otomatis",
        "description": "Deskripsi aplikasi di portal",
    },
    "CYBERGATE_APP_ICON": {
        "value": "fa-file-signature",
        "description": "Font Awesome icon class",
    },
    "CYBERGATE_APP_ORDER": {
        "value": "3",
        "description": "Urutan tampilan",
    },
    "CYBERGATE_API_SECRET": {
        "value": "",
        "description": "API secret",
    },
    "FLASK_SECRET_KEY": {
        "value": "laporan-dinasan-secret-key-2026",
        "description": "Secret key Flask",
    },
    "FLASK_PORT": {
        "value": "5004",
        "description": "Port internal",
    },
}