// Supabase Edge Function "ai" — Forkcast's only server code.
// Deployed automatically by .github/workflows/deploy-ai-function.yml when this
// file changes on main. Needs the secret GEMINI_API_KEY in Supabase → Edge
// Functions → Secrets. (SUPABASE_URL and SUPABASE_ANON_KEY are built in.)
//
// Checks the caller is signed in, forwards the prompt (and any photo) to
// Google Gemini, and returns the answer. The Gemini key never leaves Supabase.
//
// Request:  {"input": string | [{role: "user"|"assistant", content}], "images": [{mime, data}], "tier": "quick"|"default", "json": true, "stream": false}
// Response: {"text", "json", "model", "ms"}  or  {"code", "message"}
// With "stream": true the answer comes back as plain text, piece by piece, as
// Gemini writes it (chat replies show up within about a second).

const GEMINI_URL = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const env = (k: string) => Deno.env.get(k) || "";
// Gemini 3 models "think" before answering, which is slow. Food counting and
// recipes need almost none; chat and plans get a little.
const THINKING: Record<string, string> = { quick: "minimal", default: "low" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

function modelsFor(tier: string) {
  const main = env("GEMINI_MODEL") || "gemini-3.8-flash";
  const quick = env("GEMINI_MODEL_QUICK") || "gemini-3.5-flash-lite";
  // When one model is busy or slow, the next one answers instead.
  return [...(tier === "quick" ? [quick, main] : [main, quick]), "gemini-flash-latest"];
}

async function verifyUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || env("SUPABASE_ANON_KEY");
  if (!auth.startsWith("Bearer ")) throw new ApiError(401, "unauthorized", "Sign in first.");
  const res = await fetch(env("SUPABASE_URL").replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey, Authorization: auth } });
  const user = res.ok ? await res.json() : null;
  if (!user?.id) throw new ApiError(401, "unauthorized", "Your session expired. Sign in again.");
}

type Turn = { role?: string; content?: string };
function toContents(input: string | Turn[], images: { mime?: string; data?: string }[] = []) {
  const turns: Turn[] = typeof input === "string" ? [{ role: "user", content: input }] : (input || []);
  const contents: { role: string; parts: Record<string, unknown>[] }[] = [];
  for (const t of turns) {
    const role = t.role === "assistant" ? "model" : "user";
    const text = String(t.content ?? "").trim();
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + text;
    else contents.push({ role, parts: [{ text }] });
  }
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    throw new ApiError(400, "invalid_request", "The conversation must end with your message.");
  }
  for (const img of images.slice(0, 3)) {
    contents[contents.length - 1].parts.push({ inline_data: { mime_type: img.mime || "image/jpeg", data: img.data || "" } });
  }
  return contents;
}

function parseJson(text: string): unknown {
  const tries = [text, ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1])];
  for (const t of tries) { try { return JSON.parse(t); } catch { /* next */ } }
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* none */ } }
  return null;
}

async function askGemini(contents: unknown, tier: string, wantJson: boolean) {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new ApiError(500, "not_configured", "Server is missing GEMINI_API_KEY.");
  const config: Record<string, unknown> = { temperature: 0.7, thinkingConfig: { thinkingLevel: THINKING[tier] || "low" } };
  if (wantJson) config.responseMimeType = "application/json";
  let last = "", busy = false, limited = false;
  for (const model of modelsFor(tier)) {
    const call = (cfg: Record<string, unknown>) => fetch(GEMINI_URL(model), {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents, generationConfig: cfg }),
      signal: AbortSignal.timeout(25000), // a stuck model shouldn't hold the user up
    });
    let res: Response, detail = "";
    try { res = await call(config); }
    catch { last = `${model} timed out`; continue; }
    if (res.status === 400) {
      detail = (await res.text()).slice(0, 300);
      // This model doesn't accept that thinking level: retry with its default.
      if (/thinking/i.test(detail)) {
        const { thinkingConfig: _, ...rest } = config;
        try { res = await call(rest); detail = ""; } catch { last = `${model} timed out`; continue; }
      }
    }
    if (!res.ok) {
      detail = detail || (await res.text()).slice(0, 300);
      // Busy / overloaded / temporary errors: move on to the next model.
      if ([500, 502, 503, 504].includes(res.status) || /overloaded|unavailable|high demand/i.test(detail)) { last = `${model} busy`; busy = true; continue; }
      if (res.status === 429) { last = `${model} rate limited`; limited = true; continue; }
      if ((res.status === 400 || res.status === 404) && /not found|not supported/i.test(detail)) { last = detail; continue; }
      throw new ApiError(502, "upstream_error", `Gemini error ${res.status}: ${detail}`);
    }
    const data = await res.json();
    const cand = (data.candidates || [{}])[0];
    if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(cand.finishReason) || data.promptFeedback?.blockReason) {
      throw new ApiError(422, "refused", "The AI declined that one. Try rephrasing.");
    }
    const text = (cand.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("");
    if (!text.trim()) throw new ApiError(502, "empty_completion", "The AI returned nothing. Try again.");
    return { text, model };
  }
  if (limited) throw new ApiError(429, "rate_limited", "The free AI limit is used up for now. Try again in a minute, or tomorrow if it's the daily limit.");
  if (busy) throw new ApiError(503, "overloaded", "Gemini is very busy right now. Try again in a minute.");
  throw new ApiError(502, "upstream_error", "No Gemini model available: " + last);
}

// Streaming: open Gemini's SSE stream with the same model fallback, then pass
// the text through as it arrives. Fallback only happens before the first word.
async function openStream(contents: unknown, tier: string) {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new ApiError(500, "not_configured", "Server is missing GEMINI_API_KEY.");
  const config: Record<string, unknown> = { temperature: 0.7, thinkingConfig: { thinkingLevel: THINKING[tier] || "low" } };
  let last = "", busy = false, limited = false;
  for (const model of modelsFor(tier)) {
    const call = async (cfg: Record<string, unknown>) => {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000); // time to first byte
      try {
        return await fetch(GEMINI_URL(model).replace(":generateContent", ":streamGenerateContent") + "?alt=sse", {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents, generationConfig: cfg }), signal: ctl.signal,
        });
      } finally { clearTimeout(t); }
    };
    let res: Response, detail = "";
    try { res = await call(config); } catch { last = `${model} timed out`; continue; }
    if (res.status === 400) {
      detail = (await res.text()).slice(0, 300);
      if (/thinking/i.test(detail)) {
        const { thinkingConfig: _, ...rest } = config;
        try { res = await call(rest); detail = ""; } catch { last = `${model} timed out`; continue; }
      }
    }
    if (res.ok && res.body) return res.body;
    detail = detail || (await res.text()).slice(0, 300);
    if ([500, 502, 503, 504].includes(res.status) || /overloaded|unavailable|high demand/i.test(detail)) { busy = true; last = `${model} busy`; continue; }
    if (res.status === 429) { limited = true; last = `${model} rate limited`; continue; }
    if ((res.status === 400 || res.status === 404) && /not found|not supported/i.test(detail)) { last = detail; continue; }
    throw new ApiError(502, "upstream_error", `Gemini error ${res.status}: ${detail}`);
  }
  if (limited) throw new ApiError(429, "rate_limited", "The free AI limit is used up for now. Try again in a minute, or tomorrow if it's the daily limit.");
  if (busy) throw new ApiError(503, "overloaded", "Gemini is very busy right now. Try again in a minute.");
  throw new ApiError(502, "upstream_error", "No Gemini model available: " + last);
}

// Turn Gemini's SSE events into a plain stream of answer text.
function sseToText(body: ReadableStream<Uint8Array>) {
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, out) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const d = JSON.parse(line.slice(5));
          const text = (d.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("");
          if (text) out.enqueue(enc.encode(text));
        } catch { /* partial or keep-alive line */ }
      }
    },
  }));
}

// Cheap local check before spending any Gemini quota: the token must be one of
// this project's sign-in tokens and not expired. The full check with Supabase
// runs at the same time as the Gemini call (saves a round trip per message).
function quickTokenCheck(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  try {
    const payload = JSON.parse(atob(auth.replace(/^Bearer /, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const iss = String(payload.iss || "");
    if (/\/auth\/v1$/.test(iss) && payload.exp * 1000 > Date.now() && payload.sub) return;
  } catch { /* fall through */ }
  throw new ApiError(401, "unauthorized", "Your session expired. Sign in again.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ code: "method_not_allowed", message: "Use POST." }, 405);
  try {
    quickTokenCheck(req);
    const verified = verifyUser(req);
    verified.catch(() => {}); // handled below
    const raw = await req.text();
    if (raw.length > 4 * 1024 * 1024) throw new ApiError(413, "prompt_too_large", "That was too much at once (photo too big?).");
    const body = JSON.parse(raw || "{}");
    if (body.stream) {
      const [stream] = await Promise.all([openStream(toContents(body.input, body.images), body.tier), verified]);
      return new Response(sseToText(stream), { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const wantJson = body.json !== false;
    const started = Date.now();
    const [{ text, model }] = await Promise.all([askGemini(toContents(body.input, body.images), body.tier, wantJson), verified]);
    const parsed = wantJson ? parseJson(text) : null;
    if (wantJson && parsed === null) throw new ApiError(502, "invalid_json", "The answer came back garbled. Try again.");
    return reply({ text, json: parsed, model, ms: Date.now() - started });
  } catch (e) {
    if (e instanceof ApiError) return reply({ code: e.code, message: e.message }, e.status);
    return reply({ code: "upstream_error", message: "Server error: " + (e as Error).message }, 500);
  }
});
