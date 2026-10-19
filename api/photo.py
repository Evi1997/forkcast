"""GET /api/photo?q=... for local runs (python3 dev.py).

Production uses netlify/edge-functions/photo.js; keep the two in step.
Needs PEXELS_API_KEY, SUPABASE_URL and SUPABASE_ANON_KEY in .env.local.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler


def _get(url, headers):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=15) as res:
        return json.loads(res.read())


class handler(BaseHTTPRequestHandler):
    def _send(self, status, obj, cache="no-store"):
        data = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", cache)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        q = (urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("q", [""])[0]).strip()[:80]
        key, sb, anon = os.environ.get("PEXELS_API_KEY"), os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_ANON_KEY")
        if not q:
            return self._send(400, {"code": "invalid_request", "message": "Missing ?q="})
        if not key:
            return self._send(500, {"code": "not_configured", "message": "Server is missing PEXELS_API_KEY."})
        try:
            _get(sb.rstrip("/") + "/auth/v1/user", {"apikey": anon, "Authorization": self.headers.get("Authorization") or ""})
        except Exception:
            return self._send(401, {"code": "unauthorized", "message": "Sign in first."})
        try:
            data = _get("https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=" + urllib.parse.quote(q + " food"), {"Authorization": key})
        except urllib.error.HTTPError as e:
            return self._send(429 if e.code == 429 else 502, {"code": "rate_limited" if e.code == 429 else "upstream_error", "message": f"Pexels error {e.code}"})
        p = (data.get("photos") or [None])[0]
        if not p:
            return self._send(404, {"code": "not_found", "message": "No photo found."}, "private, max-age=86400")
        self._send(200, {"src": p["src"]["medium"], "alt": p.get("alt") or q, "by": p["photographer"], "byUrl": p["photographer_url"], "url": p["url"]}, "private, max-age=86400")
