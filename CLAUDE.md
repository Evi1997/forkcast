# Forkcast

- Standalone PWA on GitHub Pages (https://evi1997.github.io/forkcast/, free unlimited deploys; all paths must stay relative), Supabase for auth, data and the AI Edge Function `supabase/functions/ai/index.ts` (deployed by pasting into the Supabase dashboard), Google Gemini free tier for AI. Must stay $0.
- `api/ai.py` is a Python twin of the Supabase function used only by `dev.py`; keep both in step.
- `netlify.toml` and `netlify/` remain only until the old Netlify project is deleted; then remove them.
- Source is in `src/`; `index.html` is generated. After any change run `python3 build.py`, never edit `index.html` directly.
- AI behaviour lives in `src/js/core/prompts.js`; the server calls Gemini with JSON output. The dietitian spec is `skill/ai-dietitian/SKILL.md`.
- Scripts are classic (no import/export) sharing globals; add new files to the `SCRIPTS` list in `build.py`.
- Data model: table `user_docs(user_id, key, data jsonb)` with RLS; keys `profile`, `chat`, `plan`, `progress`, `log-YYYY-MM-DD`.
- Local run: `python3 dev.py` (port 3000), secrets in `.env.local`.
- Design follows `skill/principal-ux-ui-designer/SKILL.md`: own identity (basil green actions, paprika highlights, warm-neutral surfaces, tokens in `src/styles/tokens.css`), every text colour WCAG 2.2 AA, sentence-case buttons, no copied brand looks, no streak pressure or food shaming, undo for deletes, summary before detail.
- Netlify credits: each production deploy costs 15 of the free plan's 300/month. Commit and push freely, but only deploy when a batch of work is done, by putting `[deploy]` in the last commit message (netlify.toml `ignore` skips all other pushes). Never deploy per small change.
