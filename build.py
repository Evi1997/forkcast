#!/usr/bin/env python3
"""Build Forkcast: join src/ into one index.html, served by GitHub Pages.

Usage:  python3 build.py
No dependencies. Edit files in src/, never index.html directly.
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

STYLES = ["tokens.css", "base.css", "views.css"]

# Load order matters only for code that runs at load time; everything else
# is plain functions that call each other later.
SCRIPTS = [
    "core/constants.js",
    "core/prompts.js",
    "core/helpers.js",
    "core/storage.js",
    "core/state.js",
    "core/nutrition.js",
    "services/ai.js",
    "services/auth.js",
    "services/coach.js",
    "services/food.js",
    "services/planner.js",
    "services/onboarding.js",
    "views/shell.js",
    "views/today.js",
    "views/coach.js",
    "views/plan.js",
    "views/shop.js",
    "views/progress.js",
    "views/auth.js",
    "views/onboarding.js",
    "events.js",
    "main.js",
]


def join(folder, names, comment):
    parts = []
    for name in names:
        text = (SRC / folder / name).read_text().rstrip()
        parts.append(comment.format(name) + "\n" + text)
    return "\n\n".join(parts)


def main():
    template = (SRC / "index.template.html").read_text()
    css = join("styles", STYLES, "/* === {} === */")
    js = join("js", SCRIPTS, "// === {} ===")
    out = (template
           .replace("<!-- @styles -->", "<style>\n" + css + "\n</style>")
           .replace("<!-- @scripts -->", "<script>\n" + js + "\n</script>"))
    (ROOT / "index.html").write_text(out)
    print(f"Built index.html ({len(out) // 1024} KB) from {len(STYLES)} styles and {len(SCRIPTS)} scripts")


if __name__ == "__main__":
    main()
