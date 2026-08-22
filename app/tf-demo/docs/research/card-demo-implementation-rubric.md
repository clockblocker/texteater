# Card-demo implementation comparison rubric

Research date: 2026-08-22. This note answers [issue #216](https://github.com/clockblocker/texteater/issues/216) for the fixed behavior in [map #215](https://github.com/clockblocker/texteater/issues/215). It compares implementation fit, not visual design.

## Local and package constraints

tf-demo uses React 19, React Router 7, and Vite 8 and currently has none of the candidate interaction packages ([manifest](../../package.json)). The lockfile resolves React 19.2.8, React Router 7.18.2, and the tf-demo copy of Vite 8.1.5 ([lockfile](../../../../bun.lock)). With no explicit `build.target`, Vite 8 targets Chrome/Edge 111, Firefox 114, and Safari/iOS 16.4 by default ([Vite 8 build target](https://v8.vite.dev/config/build-options#build-target)). These are the minimum browser versions against which a candidate may claim compatibility; touch still needs real iOS Safari and Android Chrome checks.

Pin these current stable versions for the prototypes so dependency drift cannot affect the comparison:

| Variant | Packages | React 19 constraint | Material package fact |
| --- | --- | --- | --- |
| `native` | none | n/a | Use Pointer Events, not HTML Drag and Drop. Pointer Events unify mouse, touch, and pen; pointer capture keeps a stream targeted during movement, while `touch-action` must declare whether the browser may pan/zoom ([Pointer Events Level 4](https://www.w3.org/TR/pointerevents4/)). |
| `motion` | `motion@13.1.1` | Explicitly supports React/DOM 18 or 19 ([registry metadata](https://registry.npmjs.org/motion/13.1.1)) | Motion supplies pointer drag, constraints, scale feedback, drag lifecycle, and layout/shared-element animation, but explicitly does not supply drop zones ([drag docs](https://motion.dev/docs/react-drag), [layout docs](https://motion.dev/docs/react-layout-animations)). |
| `dnd-kit` | `@dnd-kit/core@6.3.1` | Peer range is React/DOM >=16.8 ([registry metadata](https://registry.npmjs.org/@dnd-kit%2fcore/6.3.1)) | Core supplies pointer/touch/keyboard sensors, droppables, rectangular collision algorithms, accessibility announcements, and `DragOverlay`; its official documentation is now labelled **Legacy**, which is a maintenance cost to record rather than an automatic failure ([sensors](https://dndkit.com/legacy/api-documentation/sensors/), [collision detection](https://dndkit.com/legacy/api-documentation/context-provider/collision-detection-algorithms/), [accessibility](https://dndkit.com/legacy/guides/accessibility/)). |
| `gesture-spring` | `@use-gesture/react@10.3.1`, `@react-spring/web@10.1.2` | Gesture supports React >=16.8; Spring explicitly includes React/DOM 19 ([gesture metadata](https://registry.npmjs.org/@use-gesture%2freact/10.3.1), [Spring metadata](https://registry.npmjs.org/@react-spring%2fweb/10.1.2)) | use-gesture supplies pointer/touch drag recognition, thresholds, tap filtering, bounds, capture control, and arrow-key dragging; Spring supplies the animation controller. Neither supplies a semantic drop zone ([gesture options](https://use-gesture.netlify.app/docs/options/)). |

All four still need the same shared backdrop, Escape handling, focus model, direct Enter/Space-to-open command, route mapping, and touch double-tap recognizer. Do not award dnd-kit for keyboard *dragging* or use-gesture for arrow-key movement: the contract requires Enter/Space to open directly. Motion's docs say it has no drop-zone model; native and gesture-spring likewise need the shared cancel-zone predicate. dnd-kit's rectangle-intersection default must be replaced or configured if it does not match that predicate.

## Capability matrix

| Concern | `native` | `motion` | `dnd-kit` | `gesture-spring` |
| --- | --- | --- | --- | --- |
| Pointer drag | Manual pointer state, capture, cancellation | Built-in drag lifecycle and feedback | Pointer sensor and activator constraints | `useDrag`, thresholds, tap filtering, capture options |
| Touch | Manual `touch-action` and `pointercancel` | Pointer drag; trigger needs `touch-action: none` ([controls docs](https://motion.dev/docs/react-use-drag-controls)) | Pointer sensor requires `touch-action`; separate Touch sensor permits different scroll trade-offs ([pointer](https://dndkit.com/legacy/api-documentation/sensors/pointer/), [touch](https://dndkit.com/legacy/api-documentation/sensors/touch/)) | Pointer events by default; optional touch events and an experimental press-to-prevent-scroll path ([options](https://use-gesture.netlify.app/docs/options/#preventscroll)) |
| Cancel zone | Shared rectangle predicate | Shared rectangle predicate | Native droppable/collision model, but use the shared predicate | Shared rectangle predicate |
| Return/open animation | CSS/Web Animations or router View Transition | Springs plus `layoutId`/`AnimatePresence` | `DragOverlay` has configurable/disableable drop animation but must remain mounted ([overlay docs](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/)) | Explicit Spring controller/transition |
| Route transition | React Router View Transition or custom retained clone | Motion shared layout across retained route elements, or router View Transition | Router View Transition or retained overlay | Spring-retained overlay or router View Transition |
| Reduced motion | CSS `prefers-reduced-motion` / JS media query | `MotionConfig reducedMotion="user"` disables transform/layout motion ([MotionConfig](https://motion.dev/docs/react-motion-config#reducedmotion)) | Explicitly disable overlay/drop/CSS motion | Spring `useReducedMotion`; explicitly make the route/cancel result immediate ([Spring utility](https://react-spring.dev/docs/utilities/use-reduced-motion)) |
| Main integration cost | Most bespoke event/state cleanup | Geometry and non-drag input remain bespoke | Provider/sensor/overlay semantics and legacy-track risk | Two packages plus explicit gesture-to-spring coordination |

React Router already exposes `viewTransition` for links and programmatic navigation and supports matching route elements with `useViewTransitionState` ([React Router guide](https://reactrouter.com/how-to/view-transitions)). Treat this as progressive enhancement: same-document View Transitions only became Baseline Newly Available in 2025, later than Vite 8's minimum browsers, and the platform documentation requires a no-transition fallback ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)). A candidate fails if navigation depends on animation support.

## Pass/fail gates

Only score variants that pass every gate with the same fake content, DOM geometry, thresholds, timing, scale, easing, and inside/outside predicate.

1. **Route and state:** every fake Segment opens exactly four independently draggable cards in the fixed order; backdrop blocks Text; each card maps to the correct `note/{note_kind}` route; dismiss/reset leaves no stale transform.
2. **Drag/drop:** mouse and touch start only after the shared threshold; outside feedback begins at the same boundary; release outside opens once; release inside, `pointercancel`, lost capture, or Escape restores the stack. Include 1 px inside/outside boundary cases.
3. **Touch/tap arbitration:** one tap never opens; the shared double-tap sequence opens once; movement cancels tap classification; dragging never also fires double-tap/click; page scrolling/zoom behavior matches the shared `touch-action` decision.
4. **Keyboard/focus:** every card is in normal tab order with a visible focus indicator and accessible name; Enter and Space open directly; Escape dismisses; backdrop dismissal restores focus to the selected fake Segment. The WAI button pattern requires both Enter and Space activation ([WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/button/)).
5. **Reduced motion:** with reduced motion enabled, dragging remains direct-manipulation but cancel/open animations and route expansion are suppressed or replaced with non-motion feedback; state and focus outcomes are unchanged. W3C's test is that interaction-triggered non-essential motion is suppressed ([WCAG technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)).
6. **Browser robustness:** pass desktop Chromium, Firefox, and WebKit at the Vite 8 floor or the project's declared higher floor, plus current iOS Safari and Android Chrome touch checks. Route navigation must still work when `document.startViewTransition` is absent.
7. **Isolation:** no production Text/Note/Convex behavior changes, no variant-only visual or acceptance changes, no console errors, listener leaks, duplicate navigation, or unresolved timers after repeated open/drag/dismiss cycles.

## Weighted scorecard

Score each category 0–4, then award `weight × score / 4`. Use 0 for unusable, 1 for major defects/workarounds, 2 for acceptable but visibly compromised, 3 for solid with minor costs, and 4 for best-in-set evidence with no material caveat. Keep reviewer notes beside every score; ties within two points are ties and go to the simpler maintenance story rather than false precision.

| Category | Weight | Evidence to compare |
| --- | ---: | --- |
| Drag and cancel-zone fidelity | 20 | Threshold accuracy, no jump, boundary accuracy, return stability, independent-card transforms |
| Touch and pointer robustness | 15 | Mouse/touch parity, scroll conflict, capture/cancel behavior, double-tap arbitration, observed latency |
| Keyboard and accessibility | 15 | Tab/focus order, Enter/Space/Escape, names/instructions, focus restoration, screen-reader smoke test |
| Card-to-route transition | 10 | Visual continuity, interruption/re-entry, history/back behavior, unsupported-API fallback |
| Reduced-motion behavior | 10 | Preference response, immediate stable outcome, no hidden transform/layout motion |
| Browser/runtime robustness | 10 | Required browser/device matrix, resize/scroll during drag, errors/leaks, repeated-cycle stability |
| Bundle and runtime cost | 10 | Actual transferred gzip/Brotli delta, parse/evaluation and drag-frame evidence on the same build/device |
| Integration and maintenance | 10 | Variant-only production SLOC, tests, dependencies/providers, cleanup paths, API/documentation maturity |

No category may compensate for a failed gate. Do not count shared harness code against a variant. Do count variant adapters, package declarations/lockfile additions, variant-specific tests, and special route-retention or accessibility code.

## Exact evidence protocol

1. Freeze the shared harness and tuning commit. Pin the versions above exactly in each prototype branch and run `bun install --frozen-lockfile` after the lockfile is committed.
2. Run the identical acceptance script in desktop Chromium, Firefox, and WebKit; run the touch subset on real or remote iOS Safari and Android Chrome. Repeat reduced-motion on/off and View Transition available/unavailable. Capture browser/version, device, pass/fail, and one short observation per scenario.
3. Measure variant-only code with `git diff --numstat <harness-commit>...HEAD -- app/tf-demo`, classifying shared/generated files separately. Record direct packages and added transitive production packages from `bun.lock`; do not use npm unpacked size as a browser-bundle score.
4. On each clean branch run `bun run --cwd app/tf-demo build`. Record every `app/tf-demo/dist/assets/*.js` raw byte count and `gzip -9 -c` byte count; compare total JavaScript against the harness branch. If card-demo routes are lazy chunks, also record the card-demo route's dependency closure from a Vite manifest and measure cold navigation transfer in the same browser with cache disabled. Use the median of five builds and five cold navigations.
5. Record a 5-second drag trace on the same hardware/browser. Compare dropped frames/long tasks and confirm transforms, not React render frequency, dominate the drag path. Bundle/runtime numbers are supporting evidence, not substitutes for touch feel.

A reproducibility probe on 2026-08-22 bundled the documented import surfaces with Bun 1.3.14, minified for browsers with React externals: native 0.1 kB gzip, Motion 44.4 kB, dnd-kit 14.4 kB, gesture+Spring 26.6 kB. These are deliberately **not scores**: the prototype's Vite output and actual imports are authoritative. Reproduce the probe with one entry per row exporting only the APIs used, then `bun build entry.ts --target browser --minify --external react --external react-dom --external react/jsx-runtime` and `gzip -9 -c`.

## Decision guidance

The research does not pick a winner before hands-on evidence. Native starts with zero dependency cost but owns every edge case. Motion has the deepest drag-to-route animation vocabulary but no drop-zone model. dnd-kit has the deepest sensor/drop/accessibility vocabulary but its keyboard defaults do not match direct-open semantics and its core docs are on the legacy track. gesture-spring exposes the most explicit gesture/physics composition but has two dependency surfaces and more coordination code. The scorecard is designed to reveal whether those costs buy better observed behavior under the same contract.
