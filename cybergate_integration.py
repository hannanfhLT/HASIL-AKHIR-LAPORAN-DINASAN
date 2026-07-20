"""
Cybergate Integration Module
============================
Modular integration layer for connecting HASIL AKHIR LAPORAN DINASAN
to Cybergate portal.
"""

import logging
import os
import json
import threading
import requests
from functools import wraps
from flask import request, jsonify, session, g

log = logging.getLogger("cybergate-integration")

# ======================
# CONFIGURATION
# ======================
class CybergateConfig:
    """Konfigurasi integrasi Cybergate — dibaca dari environment variables."""

    # Host Cybergate portal (untuk API calls)
    CYBERGATE_HOST = os.getenv("CYBERGATE_HOST", "http://cybergate-web:5000")

    # Endpoint Cybergate
    CYBERGATE_LOG_API = f"{CYBERGATE_HOST}/admin/apps/laporan-dinasan/log"
    CYBERGATE_VERIFY_API = f"{CYBERGATE_HOST}/api/verify-session"

    # App identity
    APP_NAME = os.getenv("CYBERGATE_APP_NAME", "CONVERTER LAPORAN DINASAN")
    APP_DESCRIPTION = os.getenv(
        "CYBERGATE_APP_DESCRIPTION",
        "Tool untuk konversi mentahan laporan Excel menjadi format laporan dinasan (NOC/SA) secara otomatis",
    )
    APP_ICON = os.getenv("CYBERGATE_APP_ICON", "fa-file-signature")
    APP_ORDER = int(os.getenv("CYBERGATE_APP_ORDER", "3"))

    # Security
    TRUSTED_HEADER = os.getenv("CYBERGATE_TRUSTED_HEADER", "X-Cybergate-User")
    API_SECRET = os.getenv("CYBERGATE_API_SECRET", "")

    # Whether running behind Cybergate gateway
    ENABLED = os.getenv("CYBERGATE_ENABLED", "1") == "1"


config = CybergateConfig()


# ======================
# VERIFICATION
# ======================
def get_cybergate_user():
    """
    Mendapatkan username dari header Cybergate gateway.
    Returns None jika tidak ada (akses langsung, non-gateway).
    """
    return request.headers.get(config.TRUSTED_HEADER)


def is_cybergate_request():
    """Cek apakah request datang melalui Cybergate gateway."""
    return get_cybergate_user() is not None


def get_client_ip_from_gateway():
    """Mendapatkan IP asli client dari forwarded headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "Unknown"


# ======================
# DECORATORS
# ======================
def cybergate_auth_required(f):
    """
    Decorator untuk route — tidak memblokir akses langsung.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        cybergate_user = get_cybergate_user()
        gateway_only = os.getenv("CYBERGATE_GATEWAY_ONLY", "0") == "1"

        if cybergate_user:
            # Request via gateway — percayai header
            g.cybergate_user = cybergate_user
            g.cybergate_authenticated = True
            g.cybergate_gateway = True
            log.debug("Cybergate gateway access: user=%s", cybergate_user)
            return f(*args, **kwargs)

        # Jika gateway-only mode: blokir akses langsung
        if config.ENABLED and gateway_only:
            log.warning(
                "Akses langsung ditolak (gateway-only) dari %s",
                request.remote_addr,
            )
            return jsonify({"error": "Akses hanya melalui Cybergate portal"}), 403

        # Standalone / development — izinkan akses langsung
        g.cybergate_user = None
        g.cybergate_authenticated = False
        g.cybergate_gateway = False
        return f(*args, **kwargs)

    return decorated


# ======================
# LOG FORWARDING
# ======================
def _send_log_async(payload):
    """Kirim log ke Cybergate di background thread."""
    try:
        requests.post(
            config.CYBERGATE_LOG_API,
            json=payload,
            headers={
                "X-API-Secret": config.API_SECRET,
                "Content-Type": "application/json",
            },
            timeout=2,
        )
    except requests.RequestException:
        pass


def log_user_access(
    app_name=None,
    method=None,
    path=None,
    target_url=None,
    ip_address=None,
    status_code=None,
):
    """
    Mencatat akses pengguna ke log Cybergate via API.
    """
    if not config.ENABLED:
        return

    # Hanya kirim log jika request dari gateway
    cybergate_user = get_cybergate_user()
    if not cybergate_user:
        return

    payload = {
        "app_name": app_name or config.APP_NAME,
        "method": method or request.method,
        "path": path or request.path,
        "target_url": target_url or request.url,
        "ip_address": ip_address or get_client_ip_from_gateway(),
        "status_code": status_code,
        "username": cybergate_user,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
        "app_metadata": get_app_metadata(),
    }

    # Kirim di background thread agar tidak memblokir response
    thread = threading.Thread(target=_send_log_async, args=(payload,), daemon=True)
    thread.start()


# ======================
# METADATA
# ======================
def get_app_metadata():
    """Mengembalikan metadata aplikasi untuk registrasi/resgistrasi ulang."""
    return {
        "name": config.APP_NAME,
        "description": config.APP_DESCRIPTION,
        "url": f"http://localhost:{os.getenv('FLASK_PORT', '5004')}",
        "internal_url": f"http://laporan-dinasan:{os.getenv('FLASK_PORT', '5004')}",
        "icon": config.APP_ICON,
        "order": config.APP_ORDER,
        "is_active": True,
        "version": "1.0.0",
        "health_endpoint": "/cybergate/health",
        "register_endpoint": "/cybergate/register",
    }


def register_with_cybergate(admin_api_url=None):
    """
    Mendaftarkan aplikasi ini ke Cybergate secara otomatis.
    """
    if not config.ENABLED:
        log.info("Cybergate disabled — registrasi dilewati")
        return False

    api_url = admin_api_url or f"{config.CYBERGATE_HOST}/admin/apps"
    metadata = get_app_metadata()

    log.info("Mendaftarkan ke Cybergate: %s", metadata.get("name"))

    try:
        resp = requests.post(
            api_url,
            json=metadata,
            headers={
                "X-API-Secret": config.API_SECRET,
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        if resp.status_code in (200, 201):
            log.info("Registrasi berhasil ke Cybergate")
            return True
        else:
            log.info("Registrasi Cybergate: HTTP %s (skip)", resp.status_code)
            return False
    except requests.ConnectionError:
        log.info("Cybergate tidak reachable — registrasi dilewati")
        return False
    except requests.RequestException:
        log.info("Registrasi Cybergate gagal — dilewati")
        return False


# ======================
# FLASK ROUTES
# ======================
def register_cybergate_routes(app):
    """
    Mendaftarkan semua route yang diperlukan untuk integrasi Cybergate.
    """

    @app.route("/cybergate/health")
    def cybergate_health():
        """Health check endpoint untuk Cybergate monitoring."""
        return jsonify(
            {
                "status": "ok",
                "app": config.APP_NAME,
                "version": "1.0.0",
                "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
                "cybergate_enabled": config.ENABLED,
                "metadata": get_app_metadata(),
            }
        )

    @app.route("/cybergate/register", methods=["POST"])
    def cybergate_register():
        """
        Endpoint untuk registrasi aplikasi.
        """
        api_secret = request.headers.get("X-API-Secret", "")
        if config.API_SECRET and api_secret != config.API_SECRET:
            return jsonify({"error": "Invalid API secret"}), 403

        result = register_with_cybergate()
        return jsonify(
            {
                "message": "Registrasi berhasil" if result else "Registrasi gagal",
                "metadata": get_app_metadata(),
            }
        ), (201 if result else 500)

    @app.route("/cybergate/metadata")
    def cybergate_metadata():
        """Mengembalikan metadata aplikasi."""
        return jsonify(get_app_metadata())

    @app.route("/cybergate/log", methods=["POST"])
    def cybergate_receive_log():
        """Endpoint untuk menerima log dari Cybergate."""
        data = request.get_json(silent=True) or {}
        log.info("Cybergate event received: %s", json.dumps(data, default=str))
        return jsonify({"status": "received"}), 200

    @app.route("/cybergate/status/toggle", methods=["POST"])
    def cybergate_status_toggle():
        """Toggle aktif/nonaktif dari Cybergate."""
        api_secret = request.headers.get("X-API-Secret", "")
        if config.API_SECRET and api_secret != config.API_SECRET:
            return jsonify({"error": "Invalid API secret"}), 403

        data = request.get_json(silent=True) or {}
        is_active = data.get("is_active")

        if is_active is None:
            return jsonify({"error": "Field 'is_active' required"}), 400

        os.environ["CYBERGATE_IS_ACTIVE"] = str(is_active).lower()
        log.info("Status aplikasi diubah: is_active=%s", is_active)

        return jsonify(
            {
                "message": f"Aplikasi {'diaktifkan' if is_active else 'dinonaktifkan'}",
                "is_active": is_active,
                "metadata": get_app_metadata(),
            }
        )

    @app.route("/cybergate/config")
    def cybergate_config_endpoint():
        """Mengembalikan konfigurasi lengkap."""
        return jsonify(
            {
                "app_metadata": get_app_metadata(),
                "config": {
                    "env_vars": {
                        "CYBERGATE_HOST": config.CYBERGATE_HOST,
                        "CYBERGATE_ENABLED": str(config.ENABLED),
                        "CYBERGATE_APP_NAME": config.APP_NAME,
                        "CYBERGATE_APP_ICON": config.APP_ICON,
                        "CYBERGATE_APP_ORDER": str(config.APP_ORDER),
                    },
                    "endpoints": {
                        "health": "/cybergate/health",
                        "metadata": "/cybergate/metadata",
                        "register": "/cybergate/register",
                        "config": "/cybergate/config",
                        "log": "/cybergate/log",
                        "toggle_status": "/cybergate/status/toggle",
                    },
                    "gateway": {
                        "prefix": "/gateway/<app_id>",
                        "auth_header": "X-Cybergate-User",
                        "proxy_headers": [
                            "X-Forwarded-For",
                            "X-Forwarded-Proto",
                            "X-Forwarded-Host",
                            "X-Forwarded-Prefix",
                        ],
                    },
                },
            }
        )