# Angle Attack

A Brilliant-style, learn-by-doing geometry lesson that teaches one concept deeply: the **Inscribed Angle Theorem** — an inscribed angle is half the central angle that shares the same two endpoints.

Instead of being handed a formula, learners manipulate a circle, predict, discover the pattern themselves, see a visual proof, and then practice.

**Live demo:** https://brilliant-clone-psi.vercel.app/

---

## Subject

Geometry — discovering the relationship between a **central angle** (vertex at the center, ∠AOB) and an **inscribed angle** (vertex on the circle, ∠ACB) that stand on the same two points.

## Learner persona

The primary learner is **Maya**, a 12–14 year old who understands basic angle measurement but hasn't learned circle theorems yet. She prefers visual exploration and pattern recognition over memorizing formulas, and learns primarily on mobile in short sessions.

## The lesson (8 steps)

The lesson is driven by structured content (`src/content/lessons/inscribed-angle-theorem.json`) and follows a Predict → Explore → Discover → Explain → Practice loop:

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

## Phase 1 no-AI rule

Phase 1 contains **no AI features** — no generated hints, chatbot, model calls, or AI-generated feedback. All feedback and hints are authored content.

## Future hooks (Phase 2/3)

The content-driven engine and per-user schema are designed to extend later:

- Additional circle theorems as new lesson JSON files (the `lesson_id` column already scopes progress per lesson).
- A course/home shell with multiple lessons (a locked "coming soon" card is already in place).
- Optional Google OAuth (email auth is implemented today).
- Richer resume via the existing `step_data` JSON column.
