# Forkcast

- Standalone PWA on Vercel (static files + Python function `api/ai.py`), Supabase for auth and data, Google Gemini free tier for AI. Must stay $0: no paid services.
- Source is in `src/`; `index.html` is generated. After any change run `python3 build.py`, never edit `index.html` directly.
- AI behaviour lives in `src/js/core/prompts.js`; the server calls Gemini with JSON output. The dietitian spec is `skill/ai-dietitian/SKILL.md`.
- Scripts are classic (no import/export) sharing globals; add new files to the `SCRIPTS` list in `build.py`.
- Data model: table `user_docs(user_id, key, data jsonb)` with RLS; keys `profile`, `chat`, `plan`, `progress`, `log-YYYY-MM-DD`.
- Local run: `python3 dev.py` (port 3000), secrets in `.env.local`.
