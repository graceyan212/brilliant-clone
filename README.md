# Angle Attack

A Brilliant-style, learn-by-doing geometry course. It now spans **17 lessons across 4 units** — from angle-chasing and the Pythagorean theorem through polygon area and the circle theorems — with the **Inscribed Angle Theorem** as its flagship lesson.

Every lesson uses the same discovery loop: instead of being handed a formula, learners manipulate an interactive figure, predict, discover the pattern themselves, see a staged visual proof, and then practice with code-checked problems (plus optional AI-generated extra practice).

**Live demo:** https://brilliant-clone-psi.vercel.app/

---

## Subject

Geometry — discovering the relationship between a **central angle** (vertex at the center, ∠AOB) and an **inscribed angle** (vertex on the circle, ∠ACB) that stand on the same two points.

## Learner persona

The primary learner is **Maya**, a 12–14 year old who understands basic angle measurement but hasn't learned circle theorems yet. She prefers visual exploration and pattern recognition over memorizing formulas, and learns primarily on mobile in short sessions.

## Course outline

The course is registered in [`src/content/lessons/index.ts`](src/content/lessons/index.ts) and the home screen groups it into four units. The recommended path opens with the **Parts of a circle** prequiz, then runs in this order:

**Foundations**

1. Angles & angle-chasing — vertical, corresponding, and alternate angles across crossing lines.
2. Angles in a triangle — the three angles add to 180°, plus the exterior-angle theorem.

**Triangles & Pythagoras**

3. The Pythagorean theorem — `a² + b² = c²` and Pythagorean triples.
4. Special right triangles — the 45-45-90 (`1 : 1 : √2`) and 30-60-90 (`1 : √3 : 2`) ratios.
5. Similar triangles & scaling — equal angles ⇒ proportional sides; area scales by `k²`.

**Polygons & area**

6. Polygon angles — interior-angle sum `(n − 2) × 180°` and regular-polygon angles.
7. Areas of polygons — triangle, equilateral, parallelogram, trapezoid, and kite areas.

**Circles**

- Parts of a circle *(prequiz)* — radius, chord, diameter, secant, tangent.
8. Central angles & arc measure — an arc has the same measure as its central angle.
9. The inscribed angle theorem — an inscribed angle is half its central angle (flagship lesson).
10. Cyclic quadrilaterals — opposite angles are supplementary.
11. Angles from intersecting chords — the angle is half the sum of the intercepted arcs.
12. Secants & the secant angle — from outside, the angle is half the difference of the arcs.
13. Tangents to a circle — perpendicular radius, tangent–chord angle, and equal tangents.
14. Crossing chords — the products of the two chord segments are equal.
15. Circumscribed circle — the perpendicular bisectors meet at the circumcenter.
16. Arcs and sectors — a sector is the fraction `θ/360` of its circle.

Each lesson ships with an interactive diagram, a staged proof, and code-checked practice (see the standard lesson flow below).

## The standard lesson flow (8 steps)

Every lesson is driven by structured JSON content and follows a Predict → Explore → Discover → Explain → Practice loop. Using the flagship inscribed-angle lesson (`src/content/lessons/inscribed-angle-theorem.json`) as the example:

1. **Terminology** — meet the two angles by name (central ∠AOB, inscribed ∠ACB).
2. **Prediction** — drag point C and predict what happens to ∠ACB.
3. **Exploration** — the center O appears; compare ∠ACB with the central angle ∠AOB.
4. **Discover** — identify the relationship (the central angle is twice the inscribed angle).
5. **State the theorem** — an inscribed angle is half its central angle.
6. **Visual proof** — a staged, animated proof using isosceles triangles and the angle sums.
7. **Practice** — a short quiz with immediate feedback, escalating hints after repeated misses, and an optional "More practice" set.
8. **Quiz** — a final, lightly scaffolded challenge.

## Features

- **Interactive SVG diagram** — drag points A, B, and C; live angle readouts; mouse, touch, and keyboard input; rAF-throttled for smooth dragging.
- **Content-driven lesson engine** — steps, prompts, options, and feedback come from JSON, so new lessons can reuse the same engine.
- **Immediate feedback** — per-answer responses that guide without giving away the answer, plus a stronger hint after three wrong attempts.
- **Accounts & saved progress** — email auth via Supabase; your current step and completion are saved and resumed across sessions.
- **Daily streak** — increments on consecutive days of activity.
- **Step navigation** — jump back via a clickable progress bar or a back button.
- **Mobile-first** — designed for a 375px viewport with large touch targets.

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) for routing
- SVG-based geometry diagrams (no canvas/WebGL)
- [Supabase](https://supabase.com/) for auth and progress/streak persistence
- [Vercel](https://vercel.com/) for hosting
- [oxlint](https://oxc.rs/) for linting

## Architecture overview

```
src/
  App.tsx                       # routes, home screen, lesson page, completion screen
  main.tsx                      # app entry, wraps the app in AuthProvider
  content/lessons/*.json        # lesson content (steps, prompts, feedback)
  types/lesson.ts               # lesson/step content model
  components/
    lesson/StepRenderer.tsx     # renders a step from content; quiz, proof, numeric, etc.
    diagram/CircleDiagram.tsx   # interactive draggable circle
    diagram/StaticAngleDiagram.tsx  # static figures for theorem/practice/quiz
    diagram/ProofDiagram.tsx    # staged visual proof
    auth/AuthPanel.tsx          # email sign in / sign up
  engine/geometry.ts            # angle/arc/sector math + SVG path helpers
  lib/
    supabase.ts                 # typed Supabase client
    AuthProvider.tsx            # session context + sign in/out
    progress.ts                 # load/save lesson_progress
    streaks.ts                  # daily streak logic
  types/database.types.ts       # generated Supabase types
```

### Database schema (Supabase / Postgres)

All tables have Row-Level Security enabled so a user can only read/write their own rows.

- **`profiles`** — `id` (→ `auth.users`), `email`; auto-created on sign-up via a trigger.
- **`lesson_progress`** — `user_id`, `lesson_id`, `current_step`, `completed`, `step_data`; unique per `(user_id, lesson_id)`.
- **`user_streaks`** — `user_id`, `current_streak`, `longest_streak`, `last_active_date`.

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root
cp .env.example .env
# then fill in your Supabase project values:
#   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# 3. Start the dev server
npm run dev
```

Other scripts:

- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run oxlint

> The Supabase schema is managed via migrations applied to the project. The publishable key is safe to expose in the client; RLS enforces per-user access.

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the repo in Vercel (framework preset: **Vite**).
3. Set environment variables in Vercel: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. In Supabase → Authentication → URL Configuration, add your Vercel domain to the **Site URL** and **Redirect URLs**.
5. Deploy, then verify production sign-in and that progress persists across a reload.

## Phase 2 — AI features: what we chose and why

Phase 1 shipped with **no AI** — every hint and answer is authored. Phase 2 adds exactly one AI feature, chosen because it is the one that genuinely helps this app:

**AI-generated practice problems.** The course is discovery-first and intentionally small, so the real risk is *running dry*: a learner who wants more reps hits the end of a fixed pool. AI generation keeps the "More practice" set endlessly fresh and varied — different givens, numbers, and short real-world framings — at the right difficulty for each lesson.

We deliberately did **not** add a chatbot, and we skipped adaptive-path and "explain-my-error" AI for now: the existing structured feedback (a per-answer nudge that doesn't reveal the answer, plus an escalating "bigger hint" after repeated misses) already covers the stuck-learner case without AI risk.

### How it stays safe (grounded + verified)

- **Structured state, not raw text.** The model never returns prose problems. It returns small JSON *specs* — `{ given, value, context? }` — describing only the setup: which quantity is given, its number, and an optional short real-world phrase.
- **The AI never produces the math.** The answer, the diagram, and the targeted hints are all computed in code ([`src/lib/practice.ts`](src/lib/practice.ts) `buildProblem`) — the same function the deterministic pool uses. A bad model response can never surface a wrong answer or a generic hint.
- **Verified against the subject's logic.** The edge function validates every spec against per-topic allow-lists and integer ranges (e.g. an inscribed-angle central value must be even so its half is a whole number); non-conforming specs are dropped, and a `context` phrase is rejected if it contains any digit (so it can't leak a number).
- **Server-side key.** The LLM call runs in a Supabase Edge Function ([`supabase/functions/generate-practice`](supabase/functions/generate-practice/index.ts)); the API key never reaches the browser.
- **Works with AI off.** "More practice" tries AI first, then falls back to the built-in deterministic pool on any failure. With no API key set, the whole app behaves exactly as in Phase 1.
- **Verifiable in-app.** A visible **AI on/off toggle** in the header (`src/lib/ai-settings.ts`) forces both AI surfaces — extra-practice generation and guided hints — to take the no-AI path on demand, so the fallback behaviour can be confirmed directly in the UI rather than only by unsetting the key. The preference is stored in `localStorage` and respected by `generateAiPractice` and `fetchGuidedHint`.

### Enabling AI generation

Set an `OPENAI_API_KEY` secret on the Supabase Edge Function (default model `gpt-4o-mini`, swappable). Until it is set, "More practice" uses the deterministic pool. The header toggle can also force the no-AI path with the key in place.

## Future hooks (Phase 3)

- Adaptive path: choose the next lesson from what a learner misses (per-lesson progress + streaks are already stored).
- AI "explain my answer," tuned to the learner's specific wrong input.
- More lessons as new JSON files; optional Google OAuth.
