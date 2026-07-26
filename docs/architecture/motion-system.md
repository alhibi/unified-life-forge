# Motion system

SmartHub has one motion language, and one screen that configures it:
`/settings/motion` (**الحركة والأداء**). Nothing on that screen is cosmetic —
every control either mutates the shared token object that framer-motion reads,
or publishes a CSS custom property / data attribute that `src/index.css` reads.
Most do both, which is why one change is felt by framer-motion, Radix +
tailwindcss-animate, vaul, sonner and the native press feedback at the same
moment.

## The rule

> Never author a duration or a cubic-bezier at a call site. Read a token from
> `src/lib/motion.ts` in TypeScript, or a `--motion-*` variable in CSS. A
> literal timing is a value the user's preferences cannot reach, and it will be
> the one element on the screen that refuses to move with the rest.

```css
/* wrong */
.my-thing {
  transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* right */
.my-thing {
  transition: opacity var(--motion-fade) var(--motion-ease-enter);
}
```

```tsx
/* wrong */
<motion.div transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} />
/* right */
<motion.div transition={MOTION.overlayIn} />
```

## The four layers

| layer       | file                       | owns                                                                               |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------- |
| tokens      | `src/lib/motion.ts`        | durations, easing families, springs, scale ratios, every shared variant factory    |
| runtime     | `src/lib/motionRuntime.ts` | one recompute path; mutates the tokens in place and mirrors everything to `<html>` |
| stylesheet  | `src/index.css`            | every CSS-only surface, expressed against the published variables                  |
| measurement | `src/lib/perfMonitor.ts`   | a single rAF loop feeding the live HUD and the adaptive governor                   |

`src/lib/scrollRuntime.ts` sits beside the runtime and owns scrolling;
`src/lib/bootMotion.ts` seeds all of it before React mounts.

### Why the runtime mutates in place

framer-motion reads `.duration` and `.ease` off the SAME object reference every
time a transition starts. So `applyMotionSpeed()` rewriting `MOTION.push.duration`
takes effect on the next animation without re-rendering a single component. The
alternative — threading a speed multiplier through props — would mean every
animated component in the app subscribing to the settings context.

There is exactly **one** recompute path. Each setter stores its value and calls
`recompute()`, which rebuilds every live token from captured baselines in a fixed
order. An earlier version had setters re-invoking each other (speed re-applied
bounce, which re-applied amplitude), so the result depended on the order the user
happened to touch the sliders in. Now the result is a pure function of state.

## The five characters

### Navigation — `data-nav-style`

| style     | what it does                                                    |
| --------- | --------------------------------------------------------------- |
| `silk`    | cross-fade only. No transform, **no enter delay**. The default. |
| `depth`   | Material-3-expressive scale + fade.                             |
| `slide`   | iOS push/pop with a parallax tail, mirrored for RTL.            |
| `instant` | no animation.                                                   |

`silk` is the default because it is the only one with nothing to interpolate:
opacity is a compositor-thread property, so there is no per-frame layout or
geometry work at all. That is what lets it hold a 120 Hz cadence on modest
hardware, and why it cannot appear to hesitate.

`buildNavVariants(style, rtl)` is the single factory. `PageTransition`, the
persistent tab layer in `App.tsx` and the live preview on the settings screen all
call it, so the preview is literally what a route change will do.

### Easing — `--motion-ease-nav/enter/exit/press`

Three families: `silk` (zero overshoot anywhere), `standard` (Material 3),
`expressive` (expo curves plus a real spring on press). Selecting a family
rewrites `ACTIVE_EASE` for framer and the four CSS variables for everything else.

A family that forbids overshoot clamps the spring damping ratio at ζ = 1, which
is what makes `silk` genuinely bounce-free even if the bounce slider is raised.

### Scrolling — `data-scroll-profile` / `data-scrolling`

The scroll itself runs on the compositor. The cost is what the browser is asked
to do _while_ content moves: hit-testing the position under the finger,
recalculating `:hover`, and running the colour transitions that every card, row,
link and `[data-state]` element carries — thousands of them in a long list.

The `silk` profile marks the document with `data-scrolling` for the duration of a
fling and suspends exactly that work, restoring it 140 ms after the last scroll
event or immediately on any pointer/key input. Suspending hit-testing is scoped
to coarse pointers, where the first touch of a fling is the gesture that stops
momentum and browsers already suppress its click — so nothing the user meant to
activate is ever lost. Desktop keeps full hit-testing and gives up only the
transitions.

### Overlays — `data-overlay-style`

tailwindcss-animate builds `animate-in` / `animate-out` from CSS variables
(`--tw-enter-scale`, `--tw-enter-translate-y`, …) that its utility classes set.
The "pop" of a dialog is therefore **data, not code**, and the overlay character
neutralises it centrally — no call site changes, and no surface loses its fade.

Bottom sheets and drawers are deliberately excluded: a sheet that does not travel
from its edge stops reading as a sheet.

### Disclosure

Expanding a panel is the one place a layout property has to animate. Two rules
keep it safe: it is always a **tween**, never a spring (an overshooting height
makes everything below the panel bounce), and the target comes from Radix's own
measurement, so no JavaScript measures anything per frame. See
`src/components/ui/accordion.tsx` and `collapsible.tsx`.

## Published variables

Written on `<html>` by the runtime. `--motion-duration-scale` is the one CSS
should read for timing.

| variable                                         | meaning                                                 |
| ------------------------------------------------ | ------------------------------------------------------- |
| `--motion-scale`                                 | duration multiplier (= 1 / speed). Written inline by JS |
| `--motion-perf-scale` · `--motion-perf-amp`      | the governor's own multipliers                          |
| `--motion-duration-scale`                        | the composed value — **use this one**                   |
| `--motion-nav-scale`                             | screen transitions only                                 |
| `--motion-amp` · `--motion-bounce`               | travel distance · spring overshoot                      |
| `--motion-stagger` · `--motion-press-strength`   | list cadence · how much of the press moves              |
| `--motion-ease-nav/enter/exit/in-out/press`      | the active easing family                                |
| `--motion-push/pop/modal-in/modal-out/overlay-*` | resolved archetype durations                            |
| `--motion-hz` · `--motion-fps-cap`               | measured panel rate · installed cap                     |

> **The governor cannot override an inline style.** `--motion-scale` and
> `--motion-amp` are written as inline styles on `<html>`, and inline always wins
> over a stylesheet rule. That is why the adaptive governor has its own
> `--motion-perf-*` pair and every consumer multiplies by both.

## Frame budget

`installFpsCap(hz)` wraps `window.requestAnimationFrame` — the one function every
rAF-driven animation in the app flows through, framer-motion included. A cap at
or above the measured native rate is installed as a no-op, because wrapping rAF
to enforce a limit the hardware already enforces only adds per-frame overhead.

`measureDisplayHz()` measures against the **un-wrapped** scheduler and snaps to
the common panel rates, so a 119.4 reading reports as 120.

## Adaptive governor

`installPerfGovernor(true)` watches the shared monitor. After three consecutive
seconds below 72 % of the budgeted rate — or with p95 frames past 1.8× the budget
— `<html data-perf-mode>` flips to `saver`, and restores after six healthy
seconds. Saver mode shortens durations, cuts travel, stops decorative infinite
animation and drops layer promotion. Everything it changes is purely visual: no
interaction, affordance or state indicator is ever removed.

## Compositor hints

Layer promotion is a preference, not a hardcoded optimisation. A promoted layer
costs video memory and pins a texture for as long as the hint stands, so on
low-memory devices turning it **off** is genuinely smoother. It is expressed in
CSS under `html[data-compositor-hints='true']` rather than inline, which is why
the switch actually controls it.

Two related rules earn their place:

- **Never declare a CSS transition on `transform` or `opacity` of a
  framer-motion surface.** `[data-page-surface]` used to carry a 300 ms CSS
  transition on both. framer writes those same properties inline once per frame,
  so every frame was animated twice — once by framer, once by the CSS transition
  chasing framer's last value. The visible result was a double-eased entrance
  that looked like the page hesitated. Own a property in exactly one system.
- **`scrollbar-gutter: stable` on `html`.** Without it, a page that grows past
  the viewport mid-render shifts every centered column by the scrollbar width —
  a reflow the user reads as a stutter.

## Reduced motion

Two sources, one outcome. The media query covers the OS preference before any
JavaScript runs; `html[data-reduced-motion]` covers the OS preference **OR** the
in-app switch. `applyReduceMotion()` ORs them, so an app setting can only ever
reinforce the OS preference, never override it.

## Where the settings live

`/settings/motion` → `src/pages/MotionSettings.tsx`, assembled from
`src/features/motion/components/*` using the shared atoms in
`src/features/appearance/components/AppearancePrimitives.tsx` — the same atoms
the interface screen uses, so both halves of the platform read as one product.

Persisted state is split deliberately:

- `app-motion-speed` · `app-motion-amplitude` · `app-spring-bounce` ·
  `app-fps-cap` keep their own keys. They predate the versioned document and are
  already mirrored to the cloud one field at a time.
- everything else lives in `app-motion-preferences-v1`, sanitized on every read
  by `src/lib/motionPreferences.ts`, and synced to the cloud as one
  `motionPreferences` object.

Six complete characters ship as presets (حرير · فوري · عمق · سينمائي · موفّر ·
سكون). A preset writes **both** halves, because a character that only changed the
easing would not actually feel different.

## Verification

`e2e/motion-and-interface.spec.ts` drives the real built app and asserts on
computed values on `<html>`: that every multiplier and curve is published, that
the speed multiplier genuinely retimes a resolved CSS duration, that the overlay
character is recorded, that the scroll governor marks and unmarks a real wheel
scroll, that the disclosure animates with a named keyframe rather than a spring,
and that every choice survives a reload. A control that looks right but writes
nothing fails there.
