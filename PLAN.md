# Angle Attack — Phase 1 Staged Implementation Plan

**Subject:** Geometry — Inscribed Angle Theorem
**Goal:** Build one Brilliant-style interactive lesson, in stages, with a check-in after each stage.
**Hard rule:** No AI features in Phase 1. No generated hints, chatbot, or model calls.

---

## Implementation Rule

Do not build the full app in one pass.

Each stage must end with:

1. A working artifact
2. A short demo summary
3. A list of files changed
4. A clear question for Grace: “Approve this stage before I continue?”

The next stage should not begin until Grace approves the current one.

---

# Stage 0 — Project Setup Plan Check

## Goal

Confirm the project structure before writing meaningful code.

## Build

* Create or verify project folder:

  * `~/Desktop/alpha/brilliant-clone`
* Confirm stack:

  * Vite
  * React
  * TypeScript
  * Supabase
  * Vercel
* Create initial README stub with:

  * Subject
  * Persona
  * MVP scope
  * No-AI Phase 1 rule

## Deliverable

A skeleton repo with no major app logic yet.

## Grace Check

Grace should review:

* Project name
* Folder location
* README framing
* Whether the scope still says one lesson only

## Stop Point

Stop after the scaffold exists.

Do not build the diagram yet.

---

# Stage 1 — Static App Shell

## Goal

Create the basic app layout without lesson logic.

## Build

* Set up routing:

  * `/`
  * `/lesson/inscribed-angle-theorem`
  * `/auth`
* Add mobile-first layout
* Add placeholder home screen:

  * App title: Angle Attack
  * Lesson card: Discovering the Inscribed Angle Theorem
  * Placeholder streak badge
  * Placeholder progress bar
  * Start Lesson button
* Add placeholder lesson screen:

  * Prompt area
  * Diagram area
  * Interaction area
  * Bottom Continue button

## Deliverable

A clickable but mostly static app shell.

## Grace Check

Grace should review:

* Overall visual direction
* Mobile layout
* Whether it feels more like Brilliant than a school worksheet
* Copy tone on the home screen and lesson entry

## Stop Point

Stop after the static shell is approved.

Do not implement geometry calculations yet.

---

# Stage 2 — Geometry Diagram Sandbox

## Goal

Build the core interactive diagram in isolation before connecting it to the lesson engine.

## Build

Create:

* `src/components/diagram/CircleDiagram.tsx`
* `src/engine/geometry.ts`

Diagram must support:

* Circle with labeled points A, B, C
* Fixed points A and B
* Draggable point C constrained to the circumference
* Mouse and touch dragging
* Live angle label for `∠ACB`
* Live arc label for intercepted arc `AB`
* Highlightable arc and angle wedge

Geometry utilities:

* `pointOnCircle`
* `snapToCircle`
* `angleBetweenPoints`
* `inscribedAngle`
* `arcMeasure`

## Deliverable

A standalone sandbox page or temporary lesson screen where Grace can drag point C and see live measurements update.

## Grace Check

Grace should test:

* Dragging point C feels smooth
* Touch/mouse input works
* The labels are readable
* The angle/arc relationship is visually clear
* The diagram is not too cluttered on mobile

## Stop Point

Stop after the interactive diagram works.

Do not build all 8 lesson steps yet.

---

# Stage 3 — Content Model and First Three Steps

## Goal

Prove that the lesson can be driven by structured content, not hardcoded screens.

## Build

Create:

* `src/content/lessons/inscribed-angle-theorem.json`
* `src/types/lesson.ts`
* `src/components/lesson/StepRenderer.tsx`
* Basic interaction components:

  * Multiple choice
  * Explore/continue step

Implement only the first three lesson steps:

1. Prediction
2. Exploration
3. Discover the arc relationship

The renderer should read from JSON and display:

* Prompt
* Diagram config
* Interaction type
* Answer options
* Feedback text

## Deliverable

A working mini-lesson with steps 1–3.

## Grace Check

Grace should review:

* Does the first interaction create curiosity?
* Is the prediction question clear?
* Does the learner discover the pattern before being told the theorem?
* Is the feedback tone right?
* Is the copy too wordy for mobile?

## Stop Point

Stop after steps 1–3 work from JSON.

Do not add practice, proof, Supabase, or persistence yet.

---

# Stage 4 — Local Full Lesson Engine

## Goal

Complete the full 8-step lesson locally without backend persistence.

## Build

Add remaining lesson steps:

4. Test the pattern
5. State the theorem
6. Visual proof placeholder
7. Guided practice
8. Challenge problem

Add:

* Numeric input interaction
* Client-side validation
* Feedback panel
* Retry behavior
* Step progress bar
* Local in-memory lesson state

For this stage, the proof step can be simple. It only needs to reserve the flow and show placeholder staged reasoning.

## Deliverable

A full local lesson that can be completed from start to finish.

## Grace Check

Grace should test:

* Complete the lesson end to end
* Intentionally answer wrong on a numeric step
* Confirm the feedback is specific
* Confirm the learner cannot advance without completing required actions
* Confirm the final challenge feels fair

## Stop Point

Stop after the full local lesson works.

Do not add Supabase yet.

---

# Stage 5 — Visual Proof Polish

## Goal

Make the proof step feel like a real Brilliant-style “aha” moment.

## Build

Replace the placeholder proof with a staged visual proof.

Proof animation should show:

* Center point O appearing
* Radii drawn from O to A, B, and C
* Equal radii highlighted
* Isosceles triangle structure revealed
* Central angle compared to inscribed angle
* Final relationship:

  * Inscribed angle = 1/2 intercepted arc

The proof should be:

* Visual-first
* Short
* Tap-through or step-through
* Not a wall of text

## Deliverable

A polished Step 6 proof interaction.

## Grace Check

Grace should review:

* Does the proof actually help explain why?
* Is the proof too confusing?
* Is there enough animation/visual change?
* Is the text minimal enough?
* Does this feel like the strongest part of the lesson?

## Stop Point

Stop after the proof step is approved.

Do not add auth/persistence until the core lesson experience feels good.

---

# Stage 6 — Supabase Auth and Progress Persistence

## Goal

Add accounts and saved progress only after the lesson itself works.

## Build

Set up Supabase:

* Auth

  * Email sign-in
  * Google sign-in if time allows
* Tables:

  * `profiles`
  * `lesson_progress`
  * `user_streaks`
* Row-level security
* Environment variables

Implement:

* Sign in / sign out
* Save current lesson step
* Save partial step data
* Resume from last step
* Mark lesson complete

## Deliverable

A logged-in user can leave mid-lesson and resume at the same step.

## Grace Check

Grace should test:

* Sign in
* Start lesson
* Reach step 4 or 5
* Close/reopen app
* Confirm the same step loads
* Confirm progress is tied to the account

## Stop Point

Stop after persistence works.

Do not polish the course shell yet.

---

# Stage 7 — Course Shell, Streaks, and Progress

## Goal

Add the minimal platform layer required by the assignment.

## Build

Home screen should show:

* Lesson card
* Continue/start CTA
* Lesson progress
* Completion state
* Daily streak
* Locked “Coming Soon” placeholder card

Implement streak logic:

* Any lesson activity today counts
* If last activity was yesterday, increment streak
* If last activity was earlier, reset to 1
* If already active today, keep same streak

## Deliverable

A minimal course path/home screen that makes the app feel like a learning product, not just a standalone demo.

## Grace Check

Grace should review:

* Does the home screen feel useful?
* Is the streak visible but not distracting?
* Does the progress indicator make sense?
* Does the locked future lesson feel intentional, not unfinished?

## Stop Point

Stop after the platform shell is approved.

Do not deploy yet unless mobile checks pass.

---

# Stage 8 — Mobile and Performance Pass

## Goal

Make the MVP usable on a phone-sized screen.

## Build

Test at:

* 375px width
* Touch input
* Small laptop width
* Full desktop width

Fix:

* Touch target sizes
* Diagram scaling
* Bottom button placement
* Horizontal scrolling
* Text wrapping
* Feedback panel spacing
* Drag performance

Performance targets:

* Feedback appears in under 100ms
* Diagram drag feels smooth
* First interaction loads in under 2 seconds

## Deliverable

A mobile-ready local app.

## Grace Check

Grace should test:

* Use the lesson in a 375px viewport
* Drag point C with touch or simulated touch
* Complete at least one wrong-answer recovery flow
* Confirm no layout feels cramped or broken

## Stop Point

Stop after mobile usability is approved.

Only then deploy.

---

# Stage 9 — Deploy and Final README

## Goal

Deploy the public MVP and prepare it for grading/demo.

## Build

* Push repo to GitHub
* Deploy frontend on Vercel
* Add Supabase redirect URLs
* Set Vercel environment variables
* Verify production auth
* Verify production persistence
* Finalize README

README must include:

* Subject
* Persona
* MVP scope
* Setup instructions
* Tech stack
* Architecture overview
* Deployed link
* Phase 1 no-AI note
* Future Phase 2/3 hooks

## Deliverable

A public deployed app.

## Grace Check

Grace should test production:

* Create/sign into account
* Complete part of lesson
* Reload
* Resume progress
* Complete lesson
* Confirm streak/progress updates

## Stop Point

Stop after production demo works.

Do not add Phase 2 AI features until Phase 1 is accepted.

---

# Final MVP Test Script

Run this only after all stages are approved.

1. Start from home screen.
2. Open the Inscribed Angle Theorem lesson.
3. Complete prediction step.
4. Drag point C and observe live angle/arc updates.
5. Answer one numeric question incorrectly.
6. Confirm diagram highlights the relevant arc and angle.
7. Retry correctly.
8. Step through the visual proof.
9. Complete guided practice.
10. Complete final challenge.
11. Return home and confirm progress/completion.
12. Check streak.
13. Log out and back in.
14. Confirm progress persists.
15. Repeat on 375px mobile viewport.

---

# If Time Gets Tight

Cut in this order:

1. Google OAuth
2. Locked future lesson card
3. Fancy proof animation
4. Streak longest-streak tracking
5. Extra practice problems

Do not cut:

* Draggable circle diagram
* Prediction before theorem
* Numeric feedback
* Visual proof, even if simple
* Progress persistence
* Mobile support

---

# Approval Protocol

At the end of each stage, the builder should send Grace:

```text
Stage X complete.

What works:
- ...

Files changed:
- ...

Known issues:
- ...

Please approve before I continue to Stage X+1.
```

Grace can respond with:

* Approved — continue
* Revise before continuing
* Cut scope and continue
