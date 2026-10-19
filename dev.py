#!/usr/bin/env python3
"""Run Forkcast on your Mac: python3 dev.py  →  http://localhost:3000

Serves the app and runs api/ai.py exactly like Vercel does. Put the same
secrets you set in Vercel into a .env.local file (never committed):
  GEMINI_API_KEY=...
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
env = ROOT / ".env.local"
if env.exists():
    for line in env.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))

sys.path.insert(0, str(ROOT / "api"))
from ai import handler as AiHandler  # noqa: E402


class Dev(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def do_POST(self):
        if self.path.startswith("/api/ai"):
            return AiHandler.do_POST(self)
        self.send_error(404)

    _send = AiHandler._send


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"Forkcast running at http://localhost:{port}")
    ThreadingHTTPServer(("", port), Dev).serve_forever()
