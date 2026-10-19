// POST /api/ai — Forkcast's only server code, running as a Netlify Edge Function.
//
// Checks the caller is signed in with Supabase, forwards the prompt (and any
// photo) to Google Gemini, and returns the answer. The Gemini key never
// leaves the server.
//
// Why an Edge Function: Netlify's free regular functions stop after 10 s, and a
// week plan can take longer. Edge functions only need to *start* answering
// within 40 s, so we send the headers at once and keep the connection alive
// with spaces (valid leading JSON whitespace) until Gemini replies.
//
// Request:  {"input": string | [{role: "user"|"assistant", content}], "images": [{mime, data}], "tier": "quick"|"default", "json": true}
// Response: {"text", "json"}  or  {"code", "message"}  (errors also come back with status 200 once streaming started)
//
// Environment (Netlify → Site configuration → Environment variables):
//   GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY  (required)
//   GEMINI_MODEL (default gemini-3.8-flash), GEMINI_MODEL_QUICK (default gemini-3.5-flash-lite)

const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const env = (k) => Netlify.env.get(k);

class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function modelsFor(tier) {
  const main = env("GEMINI_MODEL") || "gemini-3.8-flash";
  const quick = env("GEMINI_MODEL_QUICK") || "gemini-3.5-flash-lite";
  // Fallback alias in case Google renames or retires a model.
  return [...(tier === "quick" ? [quick, main] : [main]), "gemini-flash-latest"];
}

async function verifyUser(authHeader) {
  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new ApiError("not_configured", "Server is missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  if (!authHeader?.startsWith("Bearer ")) throw new ApiError("unauthorized", "Sign in first.");
  const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey: anon, Authorization: authHeader } });
  const user = res.ok ? await res.json() : null;
  if (!user?.id) throw new ApiError("unauthorized", "Your session expired. Sign in again.");
  return user.id;
}

function toContents(input, images) {
  const turns = typeof input === "string" ? [{ role: "user", content: input }] : (input || []);
  const contents = [];
  for (const t of turns) {
    const role = t.role === "assistant" ? "model" : "user";
    const text = String(t.content ?? "").trim();
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + text;
    else contents.push({ role, parts: [{ text }] });
  }
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    throw new ApiError("invalid_request", "The conversation must end with your message.");
  }
  for (const img of (images || []).slice(0, 3)) {
    contents[contents.length - 1].parts.push({ inline_data: { mime_type: img.mime || "image/jpeg", data: img.data || "" } });
  }
  return contents;
}

function parseJson(text) {
  const tries = [text, ...[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1])];
  for (const t of tries) { try { return JSON.parse(t); } catch {} }
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch {} }
  return null;
}

async function askGemini(contents, tier, wantJson) {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new ApiError("not_configured", "Server is missing GEMINI_API_KEY.");
  const body = { contents, generationConfig: { temperature: 0.7, ...(wantJson ? { responseMimeType: "application/json" } : {}) } };
  let last = "";
  for (const model of modelsFor(tier)) {
    let res;
    try {
      res = await fetch(GEMINI_URL(model), { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    } catch (e) {
      throw new ApiError("upstream_error", "Couldn't reach Gemini: " + e.message);
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      if (res.status === 429) throw new ApiError("rate_limited", "The free AI limit is used up for now. Try again in a minute, or tomorrow if it's the daily limit.");
      if ((res.status === 400 || res.status === 404) && /not found|not supported/i.test(detail)) { last = detail; continue; }
      throw new ApiError("upstream_error", `Gemini error ${res.status}: ${detail}`);
    }
    const data = await res.json();
    const cand = (data.candidates || [{}])[0];
    if (["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(cand.finishReason) || data.promptFeedback?.blockReason) {
      throw new ApiError("refused", "The AI declined that one. Try rephrasing.");
    }
    const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (!text.trim()) throw new ApiError("empty_completion", "The AI returned nothing. Try again.");
    return text;
  }
  throw new ApiError("upstream_error", "No Gemini model available: " + last);
}

async function answer(request) {
  await verifyUser(request.headers.get("Authorization"));
  const raw = await request.text();
  if (raw.length > 4 * 1024 * 1024) throw new ApiError("prompt_too_large", "That was too much at once (photo too big?).");
  const req = JSON.parse(raw || "{}");
  const wantJson = req.json !== false;
  const text = await askGemini(toContents(req.input, req.images), req.tier, wantJson);
  const parsed = wantJson ? parseJson(text) : null;
  if (wantJson && parsed === null) throw new ApiError("invalid_json", "The answer came back garbled. Try again.");
  return { text, json: parsed };
}

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ code: "method_not_allowed", message: "Use POST." }, { status: 405 });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const keepAlive = setInterval(() => controller.enqueue(enc.encode(" ")), 5000);
      let out;
      try { out = await answer(request); }
      catch (e) { out = { code: e.code || "upstream_error", message: e.message || "Server error." }; }
      clearInterval(keepAlive);
      controller.enqueue(enc.encode(JSON.stringify(out)));
      controller.close();
    }
  });
  return new Response(stream, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
};

export const config = { path: "/api/ai" };
