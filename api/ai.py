"""POST /api/ai for local runs (python3 dev.py).

Production uses supabase/functions/ai/index.ts, which does the same thing in
TypeScript; keep the two in step when changing behaviour.

Checks the caller is signed in with Supabase, forwards the prompt (and any
photo) to Google Gemini, and returns the answer. The Gemini key never leaves
the server.

Request:  {"input": str | [{"role": "user"|"assistant", "content": str}],
           "images": [{"mime": "image/jpeg", "data": "<base64>"}],
           "tier": "quick" | "default", "json": true}
Response: {"text": str, "json": <parsed value or null>}  or  {"code", "message"}

Environment (in .env.local for local runs):
  GEMINI_API_KEY      required, from https://aistudio.google.com/apikey
  SUPABASE_URL        required, e.g. https://abcd.supabase.co
  SUPABASE_ANON_KEY   required, the project's public anon key
  GEMINI_MODEL        optional, default gemini-3.8-flash
  GEMINI_MODEL_QUICK  optional, default gemini-3.5-flash-lite
"""
import json
import os
import re
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
MAX_BODY = 4 * 1024 * 1024


class ApiError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def models_for(tier):
    main = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
    quick = os.environ.get("GEMINI_MODEL_QUICK", "gemini-3.5-flash-lite")
    order = [quick, main] if tier == "quick" else [main, quick]
    # Fallback alias if Google renames or retires a model.
    return order + ["gemini-flash-latest"]


def http_json(url, body=None, headers=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read() or b"null")


def verify_user(auth_header):
    url, anon = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_ANON_KEY")
    if not url or not anon:
        raise ApiError(500, "not_configured", "Server is missing SUPABASE_URL or SUPABASE_ANON_KEY.")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise ApiError(401, "unauthorized", "Sign in first.")
    try:
        user = http_json(url.rstrip("/") + "/auth/v1/user", headers={"apikey": anon, "Authorization": auth_header}, timeout=10)
    except urllib.error.HTTPError:
        raise ApiError(401, "unauthorized", "Your session expired. Sign in again.")
    if not user or not user.get("id"):
        raise ApiError(401, "unauthorized", "Sign in first.")
    return user["id"]


def to_contents(inp, images):
    turns = [{"role": "user", "content": inp}] if isinstance(inp, str) else list(inp or [])
    contents = []
    for t in turns:
        role = "model" if t.get("role") == "assistant" else "user"
        text = str(t.get("content") or "").strip()
        if not text:
            continue
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n\n" + text
        else:
            contents.append({"role": role, "parts": [{"text": text}]})
    if not contents or contents[-1]["role"] != "user":
        raise ApiError(400, "invalid_request", "The conversation must end with your message.")
    for img in (images or [])[:3]:
        contents[-1]["parts"].append({"inline_data": {"mime_type": img.get("mime", "image/jpeg"), "data": img.get("data", "")}})
    return contents


def parse_json(text):
    for candidate in (text, *re.findall(r"```(?:json)?\s*(.*?)```", text, re.S)):
        try:
            return json.loads(candidate)
        except (ValueError, TypeError):
            pass
    start = min([i for i in (text.find("{"), text.find("[")) if i >= 0], default=-1)
    end = max(text.rfind("}"), text.rfind("]"))
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except ValueError:
            pass
    return None


# Gemini 3 models "think" before answering, which is slow. Food counting and
# recipes need almost none; chat and plans get a little.
THINKING = {"quick": "minimal", "default": "low"}


def ask_gemini(contents, tier, want_json):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ApiError(500, "not_configured", "Server is missing GEMINI_API_KEY.")
    config = {"temperature": 0.7, "thinkingConfig": {"thinkingLevel": THINKING.get(tier, "low")}}
    if want_json:
        config["responseMimeType"] = "application/json"
    last = None
    for model in models_for(tier):
        try:
            try:
                res = http_json(GEMINI_URL.format(model), {"contents": contents, "generationConfig": config}, {"x-goog-api-key": key}, timeout=55)
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="ignore")[:300]
                if e.code != 400 or "thinking" not in detail.lower():
                    raise urllib.error.HTTPError(e.url, e.code, detail, e.headers, None)
                # This model doesn't accept that thinking level: retry with its default.
                plain = {k: v for k, v in config.items() if k != "thinkingConfig"}
                res = http_json(GEMINI_URL.format(model), {"contents": contents, "generationConfig": plain}, {"x-goog-api-key": key}, timeout=55)
        except urllib.error.HTTPError as e:
            detail = e.msg if isinstance(e.msg, str) and e.msg.startswith("{") else e.read().decode(errors="ignore")[:300]
            if e.code in (500, 502, 503, 504) or "overloaded" in detail.lower() or "unavailable" in detail.lower():
                last = f"{model} busy"
                continue  # busy: try the next model
            if e.code == 429:
                raise ApiError(429, "rate_limited", "The free AI limit is used up for now. Try again in a minute, or tomorrow if it's the daily limit.")
            if e.code in (400, 404) and ("not found" in detail.lower() or "not supported" in detail.lower()):
                last = detail
                continue  # model unavailable: try the next one
            raise ApiError(502, "upstream_error", f"Gemini error {e.code}: {detail}")
        except urllib.error.URLError as e:
            raise ApiError(502, "upstream_error", f"Couldn't reach Gemini: {e.reason}")
        cand = (res.get("candidates") or [{}])[0]
        if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST") or (res.get("promptFeedback") or {}).get("blockReason"):
            raise ApiError(422, "refused", "The AI declined that one. Try rephrasing.")
        text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []) if not p.get("thought"))
        if not text.strip():
            raise ApiError(502, "empty_completion", "The AI returned nothing. Try again.")
        return text, model
    raise ApiError(502, "upstream_error", f"No Gemini model available: {last}")


class handler(BaseHTTPRequestHandler):
    def _send(self, status, obj):
        data = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                raise ApiError(413, "prompt_too_large", "That was too much at once (photo too big?).")
            verify_user(self.headers.get("Authorization"))
            req = json.loads(self.rfile.read(length) or b"{}")
            contents = to_contents(req.get("input"), req.get("images"))
            want_json = req.get("json", True)
            started = time.time()
            text, model = ask_gemini(contents, req.get("tier"), want_json)
            parsed = parse_json(text) if want_json else None
            if want_json and parsed is None:
                raise ApiError(502, "invalid_json", "The answer came back garbled. Try again.")
            self._send(200, {"text": text, "json": parsed, "model": model, "ms": int((time.time() - started) * 1000)})
        except ApiError as e:
            self._send(e.status, {"code": e.code, "message": e.message})
        except Exception as e:  # keep the app usable whatever happens
            self._send(500, {"code": "upstream_error", "message": f"Server error: {e}"})

    def do_GET(self):
        self._send(405, {"code": "method_not_allowed", "message": "Use POST."})
