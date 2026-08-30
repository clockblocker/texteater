# Sheet workspace DnD and animation candidates

> **Status: historical candidate shortlist.** The retained implementation
> evidence exercised these candidates, and the dnd-kit decision records the
> implemented choice.

Research date: 2026-08-23. This note answers
[`#241`](https://github.com/clockblocker/texteater/issues/241) under wayfinder
[`#240`](https://github.com/clockblocker/texteater/issues/240). It compares
current implementation fit for the fixed Sheet/Card/Pane algebra; it does not
reopen that algebra or choose final shortcuts, modifier keys, or visual styling.

## Finding

No current package owns the whole problem. DnD engines are strongest at input,
drop targeting, and cancellation; animation engines are strongest at preserving
visual identity while a compact Card becomes a Pane-filling Sheet. The prototypes
should therefore keep one semantic contract and deliberately allow different
visual handoffs.

Prototype these four maintained candidates:

1. **Motion 13.1.1** as the incumbent and animation ceiling.
2. **dnd-kit `@dnd-kit/react` 0.5.0** as the strongest integrated custom-DnD
   candidate.
3. **Pragmatic Drag and Drop 3.0.0** as the browser-native, framework-agnostic
   baseline.
4. **React Aria DnD 3.12.1** as the keyboard, touch, and screen-reader ceiling.

Do not prototype the old `@dnd-kit/core` API: dnd-kit now documents
`@dnd-kit/react` and provides a migration guide from the legacy package
([current overview](https://dndkit.com/),
[migration guide](https://dndkit.com/react/guides/migration/)). Do not repeat the
previous gesture-plus-spring variant either. `@use-gesture/react` is a gesture
recognizer rather than a DnD system, so Pane collision, cancellation, accessible
movement, and announcements would all remain application code
([gesture options](https://use-gesture.netlify.app/docs/options/)). Motion already
provides the more relevant animation-focused control in the current app.

## Local constraints

tf-demo currently uses React 19.2, Vite 8, `react-resizable-panels`, and
`motion@13.1.1` ([manifest](../../package.json)). The existing Motion demo does
not use Motion's drag primitive: it manually owns Pointer Events, pointer capture,
hit testing, and cancellation, then feeds Motion values
([implementation](../../src/playground/card-demo/variants/motion-card-demo-interaction.tsx)).
That remains useful evidence, but a new Motion prototype must exercise Motion's
actual drag lifecycle or it will only compare four renderers around the same
hand-written drag engine.

The shared pure workspace module, not any DnD package, must enforce the canonical
rules in the [tf-demo glossary](../../CONTEXT.md): only the top Sheet moves; a
valid drop atomically pops and pushes; invalid drop and cancellation do nothing;
the destination's existing lock wins; and the Card is never workspace state.

The current package tags and React peer ranges are:

| Candidate | Current package fact |
| --- | --- |
| Motion | `motion@13.1.1`, with React and React DOM 18 or 19 peers ([registry metadata](https://registry.npmjs.org/motion/latest)) |
| dnd-kit | `@dnd-kit/react@0.5.0`, with React and React DOM 18 or 19 peers ([registry metadata](https://registry.npmjs.org/%40dnd-kit%2Freact/latest)) |
| Pragmatic DnD | `@atlaskit/pragmatic-drag-and-drop@3.0.0`; its vanilla TypeScript core has no React peer dependency ([registry metadata](https://registry.npmjs.org/%40atlaskit%2Fpragmatic-drag-and-drop/latest), [core docs](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/)) |
| React Aria | `@react-aria/dnd@3.12.1`, with a React 19-inclusive peer range ([registry metadata](https://registry.npmjs.org/%40react-aria%2Fdnd/latest)) |

## Capability comparison

| Concern | Motion | dnd-kit | Pragmatic DnD | React Aria DnD |
| --- | --- | --- | --- | --- |
| Cross-Pane placement | No drop-zone model; measure Panes and resolve the target in the adapter. Motion explicitly distinguishes its drag support from native drop zones ([drag docs](https://motion.dev/docs/react-drag)). | First-class droppables, collision hooks, pointer/keyboard sensors, and drag-end target data ([overview](https://dndkit.com/), [provider events](https://dndkit.com/react/components/drag-drop-provider/)). | First-class, dynamic and nested element drop targets with `canDrop` and final target data ([drop targets](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/drop-targets)). | Low-level `useDrag` and `useDrop` work on arbitrary focusable elements and communicate allowed/final drop operations ([useDrag](https://react-aria.adobe.com/useDrag), [useDrop](https://react-aria.adobe.com/useDrop)). |
| Only-top-Sheet drag | Register only each Pane's top Sheet. | Register only each Pane's top Sheet. | Register only each Pane's top Sheet. | Register only each Pane's top Sheet. |
| Atomic cancellation | Motion drag controls can cancel, but the adapter must avoid reducer mutation until valid release ([drag controls](https://motion.dev/docs/react-use-drag-controls)). | `onDragEnd` reports both the final target and `canceled`; canceled optimistic sorting is reverted ([provider](https://dndkit.com/react/components/drag-drop-provider/), [multiple lists](https://dndkit.com/react/guides/multiple-sortable-lists/)). | `onDrop` fires for completion, cancellation, or recovery. The library cannot distinguish explicit cancellation from no-target drop, but the final target list is accurate; committing only with a valid Pane still gives the required no-op cancellation ([events](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events)). | `onDragEnd` reports `move`, `copy`, `link`, or `cancel`; commit only on a valid `move` to a Pane ([useDrag](https://react-aria.adobe.com/useDrag)). |
| Touch | Pointer drag requires an explicit `touch-action` choice on the trigger ([drag controls](https://motion.dev/docs/react-use-drag-controls)). | The default Pointer sensor covers mouse, touch, and pen and supports per-pointer activation constraints ([sensors](https://dndkit.com/react/guides/sensors/)). | The official repository claims full iOS and Android support, but it is built on native browser DnD and an unresolved touchscreen report makes real-device testing a gate ([repository](https://github.com/atlassian/pragmatic-drag-and-drop), [issue #204](https://github.com/atlassian/pragmatic-drag-and-drop/issues/204)). | Mouse, touch, keyboard, and touch-screen-reader operation are built into the low-level hooks ([useDrag](https://react-aria.adobe.com/useDrag), [useDrop](https://react-aria.adobe.com/useDrop)). |
| Keyboard and focus | No keyboard DnD model. Pane activation, focus restoration, and a non-drag move control are application code. | Pointer and Keyboard sensors are defaults; the accessibility plugin supplies focusability, ARIA state, instructions, and live announcements ([sensors](https://dndkit.com/react/guides/sensors/), [accessibility plugin](https://dndkit.com/extend/plugins/accessibility/)). | Core intentionally does not add accessible controls. Atlassian recommends explicit buttons/menus, live announcements, and deliberate focus restoration ([accessibility guidance](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)). | Enter starts drag mode, Tab visits valid targets, Enter drops, and Escape cancels. `hasDragButton` moves those bindings to an explicit handle when the Sheet has conflicting actions ([useDrag](https://react-aria.adobe.com/useDrag)). |
| Modifier-hover Card | Build a transient Card controller outside workspace state. Motion can animate its presence. | `DragOverlay` is for active drags, so modifier-hover preview remains a separate transient overlay. | Custom native drag preview starts only with a drag; modifier-hover preview remains a separate transient overlay. | `PreviewTrigger` already supports nonmodal preview on hover, focus, or long press, but modifier gating still needs an application wrapper ([PreviewTrigger](https://react-aria.adobe.com/PreviewTrigger)). |
| Reduced motion | `MotionConfig reducedMotion="user"` disables transform and layout animation; `useReducedMotion` supports alternate feedback ([MotionConfig](https://motion.dev/docs/react-motion-config), [hook](https://motion.dev/docs/react-use-reduced-motion)). | Disable/customize `DragOverlay`/Feedback drop animation and use the shared preference seam ([overlay](https://dndkit.com/react/components/drag-overlay/), [feedback](https://dndkit.com/react/guides/feedback/)). | Native preview movement is user-controlled; any destination reveal or flourish must use the shared preference seam. | Native drag movement is user-controlled; any custom preview or destination reveal must use the shared preference seam. |
| Card to Sheet continuity | Best in set: `layoutId` connects different elements, `layout` animates size/position, and `AnimatePresence` retains an exiting element ([layout animations](https://motion.dev/docs/react-layout-animations), [presence](https://motion.dev/docs/react-animate-presence)). | `DragOverlay` may render a different Card and accepts a custom async drop animation, including arbitrary Web Animations API code. It has no shared-layout identity primitive ([overlay](https://dndkit.com/react/components/drag-overlay/)). | Native custom previews inherit browser styling and geometry constraints; previews over 280 px become unusually faint on Windows. There is no drop morph ([platform constraints](https://atlassian.design/components/pragmatic-drag-and-drop/web-platform-design-constraints/), [design guidance](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines/)). | `DragPreview` can render a custom Card, but React Aria supplies interaction rather than layout animation; destination continuity is application CSS/WAAPI ([useDrag preview](https://react-aria.adobe.com/useDrag)). |

Lock precedence does not distinguish these packages. Each adapter supplies only
`sourceSheetId` and `destinationPaneId` to the same pure move transition; that
transition decides whether the incoming lock survives. Likewise, Active Pane
changes must occur after the reducer accepts the placement, not on drag-over.

## Best-fit Card-to-Sheet handoff per prototype

The semantic moment is identical in all variants: a valid release invokes one
atomic Sheet Move. The visual representation around that moment may differ:

- **Motion:** render Card and destination Sheet with the same scoped `layoutId`.
  Commit the move, retain the transient Card with `AnimatePresence`, and let the
  shared-layout transition expand it to the destination Sheet. This tests the
  strongest possible identity-preserving morph.
- **dnd-kit:** use one `DragOverlay` Card. On a valid release, commit the move and
  run a custom overlay drop animation toward the measured destination Sheet
  rectangle, crossfading the real Sheet at completion. This tests whether a DnD
  engine's explicit lifecycle is worth writing one focused geometry animation.
- **Pragmatic DnD:** use a custom native Card preview during drag, commit from the
  final Pane target, then reveal the destination Sheet with a short scale/fade or
  flash. Do not fake a shared-element morph: the native preview is controlled by
  the browser. This tests whether native drag robustness outweighs weaker visual
  continuity.
- **React Aria:** use `DragPreview` for the Card and an explicit drag affordance
  for keyboard/screen-reader mode. After valid `move`, reveal the destination
  Sheet with a reduced-motion-aware CSS/WAAPI transition. This tests the value of
  accessible input parity when continuity is application-owned.

## Controlled comparison contract

### Fixed semantics and fixtures

Every prototype must use the same pure reducer, Pane/Sheet fixtures, subject
content, minimum Pane width, stack depths, and lock states. The reducer is the
only code permitted to mutate workspace state.

1. Only a Pane's top Sheet exposes drag behavior.
2. Drag start and drag-over never mutate the stacks.
3. Valid release performs exactly one atomic move. Invalid release, Escape,
   pointer cancellation, lost capture, and unmount perform none.
4. A moving Locked Sheet keeps its lock only when the destination has none; an
   existing destination lock wins. The source never promotes another lock.
5. Successful placement activates the destination Pane. Cancellation restores
   the original Active Pane and a meaningful focus target.
6. Modifier-hover/focus preview creates a Card but no reducer action. Dismissal
   leaves no transform, portal, timer, or focus residue.
7. The same Text or Note may occur in several Sheet instances; movement is keyed
   by Sheet instance, never subject identity.

### Deliberately variable mechanics

The implementation may choose its own drag clone/portal/native preview, pointer
activation mechanics, collision primitive, physics/easing, and Card-to-Sheet
handoff. A valid comparison records these differences instead of forcing all
libraries through Motion-shaped animation. Timing may differ, but the semantic
commit and final DOM/focus state may not.

### Pass/fail gates

- **Algebra:** replay identical reducer traces for unlocked moves, lock-retaining
  moves, destination-lock-wins moves, repeated subjects, invalid drops, and
  cancellation. Final states must be byte-for-byte equal across variants.
- **Input:** pass mouse, pen, current iOS Safari, and current Android Chrome;
  include touch scrolling near a drag handle, resize during drag, cross-Pane
  scroll offsets, and dropping at every Pane boundary.
- **Focus/accessibility:** visible focus survives Pane activation and successful or
  canceled movement; announcements identify source and destination; a click/tap
  move control provides the same result without dragging. WCAG 2.2 requires a
  single-pointer alternative to authored dragging, so built-in keyboard DnD alone
  is insufficient ([Dragging Movements 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)).
- **Preview:** modifier-hover and keyboard-focus preview are dismissible,
  hoverable, and persistent while valid, matching WCAG's hover/focus-content
  requirements ([WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)).
- **Reduced motion:** with `prefers-reduced-motion: reduce`, direct pointer tracking
  remains, but non-essential cancel/drop/expansion motion is suppressed and the
  same state/focus result appears immediately
  ([W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)).
- **Runtime:** run under React Strict Mode with React 19.2, repeat mount/unmount and
  cancellation cycles, and fail on console errors, leaked listeners/portals,
  duplicate commits, or stale Card visuals.

### Decision evidence

For each passing prototype, record video for mouse and real touch, a reduced-motion
capture, screen-reader/keyboard notes, variant-only production SLOC, direct and
transitive packages, built JavaScript delta, and a five-second drag performance
trace on the same device. Score visual continuity and DnD correctness separately;
otherwise Motion's animation strength or a DnD package's sensor strength can hide
the other's integration cost.

The choice should be made from the hands-on result. Research predicts Motion will
set the continuity ceiling and dnd-kit the integrated-DnD ceiling. Pragmatic DnD
and React Aria are valuable controls because they reveal, respectively, the cost
of browser-native previews and the benefit of accessible input parity.
