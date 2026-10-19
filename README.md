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

Forkcast is a single file, [`index.html`](index.html), built as a [Claude](https://claude.ai) artifact. On claude.ai it uses:

| Capability | Used for |
| --- | --- |
| `sample` | The AI dietitian: chat, food estimates, photo logging, plans, recipes |
| `db` + `user` | Saving your profile, diary, plan and progress privately to your Claude account |

Opened outside Claude (for example straight from GitHub Pages), the page still loads, but the AI features are off and data is saved only in that browser.

## The dietitian skill

[`skill/ai-dietitian/SKILL.md`](skill/ai-dietitian/SKILL.md) is the full dietitian specification as a Claude skill: consultation flow, health screening, energy and macro calculation, meal planning, shopping lists, meal prep, daily tracking, weekly check-ins, the weak-point rule and safety principles.

To use it in Claude Code, copy the folder into your personal skills:

```bash
cp -r skill/ai-dietitian ~/.claude/skills/
```

## Safety

Forkcast never encourages starvation, purging, extreme fasting, crash diets or very-low-calorie diets, and does not build calorie-deficit plans for minors. For pregnancy, diabetes, kidney or liver disease, eating-disorder concerns or rapid unexplained weight change, it flags **Needs medical review** and recommends working with a healthcare professional.
