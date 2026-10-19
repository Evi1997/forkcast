// GET /api/photo?q=greek+yogurt+bowl — finds one food photo on Pexels (free API).
// Signed-in users only, so the free quota (200 searches/hour) isn't open to anyone.
//
// Response: {"src", "alt", "by", "byUrl", "url"}  or  {"code", "message"}
// Environment: PEXELS_API_KEY (https://www.pexels.com/api/), SUPABASE_URL, SUPABASE_ANON_KEY

const env = (k) => Netlify.env.get(k);
const json = (obj, status = 200, cache = "no-store") =>
  Response.json(obj, { status, headers: { "Cache-Control": cache } });

async function signedIn(authHeader) {
  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY");
  if (!url || !anon || !authHeader?.startsWith("Bearer ")) return false;
  const res = await fetch(url.replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey: anon, Authorization: authHeader } });
  return res.ok;
}

export default async (request) => {
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return json({ code: "invalid_request", message: "Missing ?q=" }, 400);
  if (!env("PEXELS_API_KEY")) return json({ code: "not_configured", message: "Server is missing PEXELS_API_KEY." }, 500);
  if (!(await signedIn(request.headers.get("Authorization")))) return json({ code: "unauthorized", message: "Sign in first." }, 401);

  const search = "https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=" + encodeURIComponent(q + " food");
  const res = await fetch(search, { headers: { Authorization: env("PEXELS_API_KEY") } });
  if (res.status === 429) return json({ code: "rate_limited", message: "Photo limit reached for this hour." }, 429);
  if (!res.ok) return json({ code: "upstream_error", message: "Pexels error " + res.status }, 502);
  const p = (await res.json()).photos?.[0];
  if (!p) return json({ code: "not_found", message: "No photo found." }, 404, "private, max-age=86400");
  return json({ src: p.src.medium, alt: p.alt || q, by: p.photographer, byUrl: p.photographer_url, url: p.url }, 200, "private, max-age=86400");
};

export const config = { path: "/api/photo" };
