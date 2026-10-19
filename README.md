# Forkcast 🍴

**Your AI dietitian and meal-prep planner.** Forkcast works like seeing a good dietitian every week: it gets to know you first, counts what you eat from plain words or a photo, plans a full meal-prep week, and keeps asking the questions that move you forward.

> Forkcast gives nutrition guidance and planning, not diagnosis or medical treatment.

## What it does

- **First consultation.** A conversational intake covering eight areas: body and goal, health screening, lifestyle, current eating, weak points, food preferences, cooking and meal prep, and shopping and budget. A few questions at a time, never one giant form.
- **Calorie and macro tracking.** Type "2 eggs, avocado toast and a cappuccino" or add a photo. Forkcast estimates calories, protein, carbs, fat and fiber, and asks a short follow-up when a portion is unclear.
- **Personal targets.** Estimated with Mifflin-St Jeor (BMR → activity → goal), using a moderate, sustainable deficit or surplus. Always labelled as estimates.
- **Weak-point focus.** It always asks what holds you back (weekends, evenings, eating out…), then turns that into a focus area with practical tips and builds the plan around it.
- **7-day meal-prep plan.** Meals built around food you like, with portions, macros, swaps and on-demand recipes. Tap "I ate this" to log a meal.
- **Shopping list and prep schedule.** One consolidated grocery list, grouped by aisle, plus a prep timeline (what to fridge, freeze or cook fresh).
- **Progress and weekly check-ins.** Weigh-ins with a 7-day average trend, plus a check-in on adherence, hunger, energy, sleep and how your weak point went. Your dietitian reviews the trend and adjusts the plan.
- **Streaks.** A daily logging streak and a weekly dot tracker.

## Design

Clean, white, fintech-style layout inspired by Revolut, with Duolingo-style tactile buttons and streaks. Light and dark mode. On desktop it has a side menu; on a phone, a bottom tab bar, so it works when added to your home screen.

## How it runs

Forkcast is a web app you install on your phone's home screen: **https://evi1997.github.io/forkcast/**. Everything runs on free tiers, and deploys never cost anything:

| Piece | Service | Cost |
| --- | --- | --- |
| Website and link | [GitHub Pages](https://pages.github.com) | Free, unlimited deploys |
| Sign-in, database, AI server function | [Supabase](https://supabase.com) (Free) | Free |
| AI dietitian | [Google Gemini API](https://aistudio.google.com) (free tier) | Free, with daily limits |

The browser never sees the Gemini key: the app calls the Supabase Edge Function `ai`, which checks you're signed in and then asks Gemini.

## Project structure

`build.py` joins `src/` into the `index.html` that GitHub Pages serves.

```
supabase/functions/ai/   AI server function: checks sign-in, calls Gemini
api/ai.py                Python twin of it, for running locally
src/
  index.template.html    page shell: head, install tags, nav
  styles/                tokens.css (colours, fonts) · base.css · views.css
  js/
    core/
      prompts.js         ← everything sent to the AI: dietitian rules and all prompts
      nutrition.js       Mifflin-St Jeor targets, consultation progress, streaks
      storage.js         Supabase documents with an on-device copy
      state.js           app state, loading and saving
      constants.js · helpers.js
    services/            ai · auth (sign-in) · coach chat · food logging · planner
    views/               auth, today, coach, plan, shop, progress
    events.js · main.js
supabase/schema.sql      database table and security rules
config.js                public Supabase URL and anon key
manifest.webmanifest · sw.js · icons/   home-screen install and offline support
build.py · dev.py        build the page · run locally
```

**To change how the dietitian behaves**, edit `src/js/core/prompts.js`. **To change the look**, edit `src/styles/`. Then rebuild and push; GitHub Pages updates automatically (free):

```bash
python3 build.py
```

Never edit `index.html` by hand; it is overwritten on every build.

## The dietitian skill

[`skill/ai-dietitian/SKILL.md`](skill/ai-dietitian/SKILL.md) is the full dietitian specification as a Claude skill: consultation flow, health screening, energy and macro calculation, meal planning, shopping lists, meal prep, daily tracking, weekly check-ins, the weak-point rule and safety principles.

## The design skill

[`skill/principal-ux-ui-designer/SKILL.md`](skill/principal-ux-ui-designer/SKILL.md) is the UX/UI guide the app's design follows: accessibility (WCAG 2.2 AA), clear hierarchy, recoverable actions, and no dark patterns or shame-based nudges. Install it the same way as the dietitian skill.

## Safety

Forkcast never encourages starvation, purging, extreme fasting, crash diets or very-low-calorie diets, and does not build calorie-deficit plans for minors. For pregnancy, diabetes, kidney or liver disease, eating-disorder concerns or rapid unexplained weight change, it flags **Needs medical review** and recommends working with a healthcare professional.
