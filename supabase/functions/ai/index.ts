// Supabase Edge Function "ai" — Forkcast's only server code.
// Deploy: Supabase → Edge Functions → Deploy a new function → Via editor,
// name it "ai", paste this file, Deploy. Add the secret GEMINI_API_KEY under
// Edge Functions → Secrets. (SUPABASE_URL and SUPABASE_ANON_KEY are built in.)
//
// Checks the caller is signed in, forwards the prompt (and any photo) to
// Google Gemini, and returns the answer. The Gemini key never leaves Supabase.
//
// Request:  {"input": string | [{role: "user"|"assistant", content}], "images": [{mime, data}], "tier": "quick"|"default", "json": true}
// Response: {"text", "json", "model", "ms"}  or  {"code", "message"}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ code: "method_not_allowed", message: "Use POST." }, 405);
  try {
    await verifyUser(req);
    const raw = await req.text();
    if (raw.length > 4 * 1024 * 1024) throw new ApiError(413, "prompt_too_large", "That was too much at once (photo too big?).");
    const body = JSON.parse(raw || "{}");
    const wantJson = body.json !== false;
    const started = Date.now();
    const { text, model } = await askGemini(toContents(body.input, body.images), body.tier, wantJson);
    const parsed = wantJson ? parseJson(text) : null;
    if (wantJson && parsed === null) throw new ApiError(502, "invalid_json", "The answer came back garbled. Try again.");
    return reply({ text, json: parsed, model, ms: Date.now() - started });
  } catch (e) {
    if (e instanceof ApiError) return reply({ code: e.code, message: e.message }, e.status);
    return reply({ code: "upstream_error", message: "Server error: " + (e as Error).message }, 500);
  }
});
