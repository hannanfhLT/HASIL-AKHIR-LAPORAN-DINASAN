"""
Hasil Akhir Laporan Dinasan — Cybergate Integrated
=================================================
Flask application that serves the static Laporan Dinasan converter
and integrates with Cybergate portal.
"""

import logging
import os
import sys
import time
from flask import Flask, send_from_directory, request, jsonify
from dotenv import load_dotenv

# ======================
# LOAD .ENV
# ======================
load_dotenv()

# ======================
# LOGGING CONFIGURATION
# ======================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("laporan-dinasan")

app = Flask(__name__)
app.secret_key = os.environ.get(
    "FLASK_SECRET_KEY",
    "laporan-dinasan-secret-key-2026-random-abc123",
)

# ======================
# CYBERGATE INTEGRATION
# ======================
from cybergate_integration import (
    config as cg_config,
    cybergate_auth_required,
    register_cybergate_routes,
    register_with_cybergate,
    get_cybergate_user,
    log_user_access,
)

register_cybergate_routes(app)

# ======================
# REQUEST START TIME
# ======================
@app.before_request
def set_request_start_time():
    request.start_time = time.time()


# ======================
# REQUEST LOGGING MIDDLEWARE
# ======================
@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    cybergate_user = get_cybergate_user()

    if cybergate_user:
        log.info(
            "%s %s -> %s (%.3fs) [Cybergate user: %s]",
            request.method,
            request.path,
            response.status_code,
            duration,
            cybergate_user,
        )
        # Kirim access log ke Cybergate
        log_user_access(
            method=request.method,
            path=request.path,
            status_code=response.status_code,
        )
    else:
        log.info(
            "%s %s -> %s (%.3fs)",
            request.method,
            request.path,
            response.status_code,
            duration,
        )
    return response


# ======================
# STATIC FILE ROUTES
# ======================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route("/")
@cybergate_auth_required
def index():
    """Serve index.html with injected Cybergate user info."""
    # Ambil user dari header gateway (server-side)
    current_user = get_cybergate_user() or "Guest"
    # Portal URL selalu di root domain Cybergate
    portal_url = "/portal"

    with open(os.path.join(BASE_DIR, "index.html"), "r") as f:
        html = f.read()

    # Inject user & portal URL via inline script (sebelum </head>)
    inline_script = f"""
<script>
window._CYBERGATE_USER = "{current_user}";
window._CYBERGATE_PORTAL_URL = "{portal_url}";
</script>
"""
    html = html.replace("</head>", inline_script + "</head>")
    return html

@app.route("/script.js")
def serve_script():
    return send_from_directory(BASE_DIR, "script.js")

@app.route("/style.css")
def serve_style():
    return send_from_directory(BASE_DIR, "style.css")

@app.route("/api/status")
@cybergate_auth_required
def api_status():
    """Simple status endpoint for the app."""
    return jsonify(
        {
            "app": "Converter Laporan Dinasan",
            "version": "1.0.0",
            "cybergate_enabled": cg_config.ENABLED,
            "cybergate_user": get_cybergate_user(),
        }
    )


# ======================
# STARTUP
# ======================
if cg_config.ENABLED:
    log.info("=" * 50)
    log.info("  Cybergate Integration: ENABLED")
    log.info("  App Name: %s", cg_config.APP_NAME)
    log.info("  Cybergate Host: %s", cg_config.CYBERGATE_HOST)
    log.info("=" * 50)

    # Auto-register ke Cybergate saat startup
    if register_with_cybergate():
        log.info("✅ Registrasi otomatis berhasil!")
    else:
        log.info("ℹ️  Registrasi otomatis dilewati.")
else:
    log.info("=" * 50)
    log.info("  Cybergate Integration: DISABLED")
    log.info("=" * 50)

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    port = int(os.getenv("FLASK_PORT", "5004"))
    log.info("Starting Laporan Dinasan on port %s (debug=%s)", port, debug)
    app.run(host="0.0.0.0", port=port, debug=debug)