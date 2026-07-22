# UI revamp — design notes (fable/ui-revamp)

Direction: **"Warm Signal"** (refined evolution of the existing identity), with the
"Quiet Paper" borderless list treatment for job lists on company pages.
Phase 1 audit + direction rationale: see the published audit artifact
(claude.ai/code/artifact/0723e7e8-4404-4fec-9856-c78b5cee03ec).

## The one-sentence rule

Amber is the *signal*, not the theme: it appears only when something matters —
a match, a new-alert badge, the single primary action per screen ("Get alerts").
Everything else is ink, hairlines, and calm.

## Tokens (globals.css)

- **Light** palette unchanged (it was already right): white canvas, `#f7f6f3`
  warm card, `#37352f` ink, `#787774` muted, burnished amber primary
  `oklch(0.58 0.155 54)`.
- **Dark** is now real: warm near-black `oklch(0.205 0.008 73)` (~`#191715`)
  canvas, `~#211e1b` cards, `~#edeae4` ink. Amber brightens to
  `oklch(0.75 0.135 65)` (~`#e8a33d`) and flips to **dark** text on top.
  Never neutral gray, never blue-black.
- **Status hues** (replace every hard-coded emerald/blue/green/red):
  `--moss` success/hiring-active, `--clay` rejected/danger-soft,
  `--slate-warm` "applied" (the one deliberately cool tone),
  each with a `-soft` wash where needed. Exposed as Tailwind colors
  (`text-moss`, `bg-clay-soft`, …).
- **Motion tokens**: `--dur-fast: 140ms` (hover/press), `--dur-med: 240ms`
  (collapse, dismiss, toasts), `--ease-settle: cubic-bezier(0.32,0.72,0,1)`.
  Utilities: `.animate-rise` + `.stagger-children` (25ms steps, first 8),
  `.skeleton` shimmer, `.collapse-grid` (animatable height via grid rows).
- `scroll-behavior: smooth` **removed** globally (was making all programmatic
  scrolling rubbery). Reduced-motion kill switch disables all
  animation/transition globally.

## Component rules

- **Buttons**: `default` variant = amber = signal actions only ("Get alerts").
  New `ink` variant replaces the six inline
  `bg-foreground text-background hover:bg-foreground/90 rounded-lg` overrides —
  ink is the workhorse CTA (nav-ish actions: "Add company", "Start tracking").
- **Numbers are mono**: counts, salaries, timestamps, stats → Geist Mono with
  `tabular-nums`. Prose and names stay DM Sans.
- **Type scale**: app page titles are `text-3xl tracking-tight` everywhere
  (dashboard, matches, settings, companies, company detail). Section headings
  `text-lg`. Micro-labels: 11px mono uppercase, tracking-wider.
- **Feedback**: sonner Toaster mounted in root layout; all toasts go through it.
  Destructive-ish actions (dismiss) get an Undo toast.
- **Optimistic UI**: follow/unfollow flips instantly, server action settles in
  a transition, reverts + toasts on failure.
- **Focus**: every raw `<button>`/pill gets
  `focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none`
  (match the shadcn primitives).
- **Dark mode**: next-themes ThemeProvider (`attribute="class"`,
  `defaultTheme="system"`), toggle lives in the account dropdown + settings.
  `suppressHydrationWarning` on `<html>` (required by next-themes).

## Layout rules

- Browse layout uses **one frame** regardless of auth state:
  `max-w-6xl px-4 sm:px-6 py-8 sm:py-10` (was 5xl/4/8 logged out — the site
  subtly changed shape when you signed in).
- Company detail: job lists use the Quiet Paper treatment — borderless rows,
  hairline separators, hover indents 14px and draws a 2px amber tick,
  "Apply ↗" revealed on hover/focus. Card chrome only for things that are
  actually cards (matches, guides).
- Mobile volume lists (companies browse): client-side "Show more" after 24
  items instead of a 25,000px scroll. (Server still returns up to 100;
  no backend change.)

## Deliberately not done

- React `<ViewTransition>` route morphs: exists in this Next version but behind
  `experimental.viewTransition` — not enabling an experimental flag on a live
  product. Route feel comes from `loading.tsx` skeletons instead.
- No new dependencies. next-themes + sonner were already in package.json.
- `error.tsx` uses this Next version's `unstable_retry` prop (not `reset`).
