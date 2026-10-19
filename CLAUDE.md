# Forkcast

- Source is in `src/`; `index.html` is generated. After any change run `python3 build.py`, never edit `index.html` directly.
- AI behaviour lives in `src/js/core/prompts.js`. The dietitian spec is `skill/ai-dietitian/SKILL.md`.
- Runs as a Claude artifact (free, no backend): publish the built `index.html` to https://claude.ai/artifact/JTDuSFbk4HwBpzrFoL2dAt (capabilities: sample with images, db, user).
- Scripts are classic (no import/export) sharing globals; add new files to the `SCRIPTS` list in `build.py`.
