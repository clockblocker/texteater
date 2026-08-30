# dnd-kit vs Pragmatic Drag and Drop for the Card/Sheet workspace

> **Status: implemented library decision.** The production workspace currently
> uses the pinned `@dnd-kit/react` and `@dnd-kit/collision` packages described
> here.

Research date: 2026-08-25.

## Decision

Use **dnd-kit `@dnd-kit/react@0.5.0`** for the retained Sheet workspace.
Keep Card and Sheet rendering independent of the drag library, and keep Motion
available for presentation animation if the final morph needs more than
dnd-kit's Web Animations hook.

This is a fit decision, not a claim that dnd-kit is universally better.
Pragmatic Drag and Drop is the smaller and more framework-independent core, and
it is a credible fallback. dnd-kit wins here because this interaction needs one
coordinated React drag lifecycle for two source kinds, precise Card Tail handles,
custom overlays, keyboard operation, and a controlled responsive Card-to-Sheet
handoff.

The main risk is API churn: `@dnd-kit/react` is still pre-1.0. Its maintainer has
described the rewritten API as production-ready while warning that APIs may
change before 1.0 ([first-party roadmap answer](https://github.com/clauderic/dnd-kit/discussions/1803)).
Keep the exact version pin and isolate it behind one workspace adapter.

## Required interaction

This comparison assumes:

- each Resolution Card is independent and content-agnostic;
- the front Card is draggable from its whole visible surface;
- each back Card is draggable only from its exposed bottom Card Tail;
- dropping a Card on a Pane creates a Sheet for that Card's subject;
- only a Pane's top placed Sheet is draggable between Panes;
- Card and Sheet are presentations, not extra Sheet algebra states;
- mouse, touch, and keyboard users can perform the operation;
- a click/tap destination menu provides the same result without dragging.

The last item is required regardless of library. WCAG 2.2 SC 2.5.7 requires a
single-pointer alternative to authored dragging, and explicitly notes that
keyboard equivalence alone is insufficient
([W3C explanation](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)).

## Decision table

“Fact” records documented or locally observed behavior. “Inference” applies that
evidence to this workspace.

| Concern | dnd-kit | Pragmatic Drag and Drop | Decision |
| --- | --- | --- | --- |
| Overlapping independent Cards | **Fact:** `useDraggable` separates the draggable element from an optional `handle`; only the connected handle starts a drag ([hook](https://dndkit.com/react/hooks/use-draggable/)). **Inference:** use the whole Card as the front activator and each back Card's Tail as its handle. | **Fact:** the element adapter accepts a draggable element and a separate `dragHandle`; Atlassian's guidance supports whole-entity dragging or a handle when the entity has interactive content ([source](https://github.com/atlassian/pragmatic-drag-and-drop/blob/main/packages/core/src/adapter/element-adapter.ts), [design guidance](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines/)). **Inference:** the same Tail geometry is viable. | Tie; overlap itself is CSS and presentation state. |
| Pane targets and two source kinds | **Fact:** `useDroppable`, source/target data, source types, configurable collision detection, and an explicit `canceled` flag are first-class ([provider](https://dndkit.com/react/components/drag-drop-provider/), [collision detection](https://dndkit.com/react/guides/collision-detection/)). | **Fact:** element drop targets support data, `canDrop`, nesting, dynamic dimensions, and monitors ([core](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/), [drop targets](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/drop-targets/)). `onDrop` cannot distinguish Escape from another no-target ending, although its final target list is accurate ([events](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events)). | Slight dnd-kit advantage. Both can commit only when the final target is a Pane; dnd-kit's cancellation signal is clearer to test. |
| Responsive Card-to-Sheet morph | **Fact:** `DragOverlay` renders arbitrary React content and accepts an async custom drop animation using WAAPI or another animation engine ([overlay](https://dndkit.com/react/components/drag-overlay/)). | **Fact:** Pragmatic uses the browser's native drag preview. The browser adds visual styling, limits cursor control, and makes previews over 280×280 unusually faint on Windows ([platform constraints](https://atlassian.design/components/pragmatic-drag-and-drop/web-platform-design-constraints/)). | Strong dnd-kit advantage. Its overlay can animate from measured Card geometry to the actual responsive destination Sheet. Pragmatic needs a second app-owned element after native DnD ends, making continuity a handoff rather than one morph. |
| Mouse, touch, and pen | **Fact:** the default Pointer sensor covers mouse, touch, and pen, supports per-input activation constraints, and can bind a specific handle ([sensors](https://dndkit.com/react/guides/sensors/)). | **Fact:** Atlassian states full Chrome, Safari, Firefox, iOS, and Android support ([repository](https://github.com/atlassian/pragmatic-drag-and-drop)). | Both require real iOS and Android verification. dnd-kit offers more explicit control over touch delay versus scroll intent; Pragmatic offers native behavior but also native platform variance. |
| Keyboard and screen reader drag | **Fact:** Keyboard and Pointer sensors are defaults. The default Accessibility plugin adds focusability, ARIA state, instructions, and live-region announcements ([sensors](https://dndkit.com/react/guides/sensors/), [accessibility plugin](https://dndkit.com/extend/plugins/accessibility/)). | **Fact:** the core deliberately adds no accessible controls. Atlassian recommends buttons/menus, live announcements, and focus restoration ([accessibility guidance](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)). | dnd-kit provides the stronger baseline. In both cases tf-demo must customize labels and announce source and destination. |
| Non-drag alternative | **Fact:** neither core can infer the right destination UI. | **Fact:** Atlassian explicitly recommends a move menu; WCAG still applies to either library. | Tie. Implement one Card/Sheet “Move to Pane…” action that calls the same `OpenSheet` or `MoveTopSheet` command as a valid drop. |
| React 19 and Vite 8 | **Fact:** the pinned dnd-kit package declares React and React DOM 18 or 19 peers ([package metadata](https://registry.npmjs.org/%40dnd-kit%2Freact/0.5.0)). | **Fact:** the core is vanilla TypeScript, works with any view layer, and has no React peer dependency ([core docs](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/), [package metadata](https://registry.npmjs.org/%40atlaskit%2Fpragmatic-drag-and-drop/3.0.0)). | Tie. The current React 19.2/Vite 8 app type-checks with both installed; neither requires Vite-specific integration. |
| Maintenance and release activity | **Fact:** dnd-kit 0.5.0 was released on 2026-06-11 and the repository had a keyboard-sensor fix on 2026-07-13 ([release](https://github.com/clauderic/dnd-kit/releases/tag/%40dnd-kit/react%400.5.0), [commit](https://github.com/clauderic/dnd-kit/commit/6fb57833026e06bb3925eef78316ba56d59749c8)). | **Fact:** Pragmatic 3.0.0 was published on 2026-08-14; Atlassian says its public repository mirrors the internal monorepo daily, and the mirror synchronized on 2026-08-25 ([npm](https://www.npmjs.com/package/%40atlaskit/pragmatic-drag-and-drop), [repository policy](https://github.com/atlassian/pragmatic-drag-and-drop), [commit](https://github.com/atlassian/pragmatic-drag-and-drop/commit/ba111edff47d081852ece1df4c3e15597cfbdabf)). | Both are active. Pragmatic has the maturity advantage; dnd-kit has the pre-1.0 isolation requirement. |
| Bundle and dependencies | **Fact:** `@dnd-kit/react` brings `@dnd-kit/abstract`, `@dnd-kit/dom`, `@dnd-kit/state`, and `tslib` ([package metadata](https://registry.npmjs.org/%40dnd-kit%2Freact/0.5.0)). | **Fact:** Atlassian describes the core used through granular entry points as about 4.7 kB and lists three direct runtime dependencies for 3.0.0 ([repository](https://github.com/atlassian/pragmatic-drag-and-drop), [package metadata](https://registry.npmjs.org/%40atlaskit%2Fpragmatic-drag-and-drop/3.0.0)). | Pragmatic advantage. Do not turn package unpacked size into a bundle claim; measure the production chunk after the rejected variants are deleted. |
| Current prototype lazy chunk | **Fact:** the built dnd-kit adapter chunk is 98,613 bytes minified and 32,417 bytes gzip. | **Fact:** the built Pragmatic adapter chunk is 23,274 bytes minified and 7,078 bytes gzip. | Strong Pragmatic advantage: the present dnd-kit prototype costs about 25.3 kB more gzip. These route-isolated chunks include adapter implementation, so remeasure after consolidation and dead-code removal. |
| Testing and debugging | **Fact:** dnd-kit exposes explicit lifecycle events, cancellation, collision hooks, and an optional visual Debug plugin ([monitor](https://dndkit.com/react/hooks/use-drag-drop-monitor/), [debug plugin](https://dndkit.com/extend/plugins/debug/)). | **Fact:** Pragmatic publishes an optional unit-testing package, while interaction still rides the native browser DnD lifecycle ([testing package](https://atlassian.design/components/pragmatic-drag-and-drop/optional-packages/unit-testing), [events](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events)). | Slight dnd-kit advantage for deterministic component-level state and cancellation assertions. Both need Playwright plus real-device touch coverage. |

## Local implementation evidence

The app currently pins React `^19.2.6`, Vite `^8`, dnd-kit `0.5.0`, Pragmatic
`3.0.0`, and Motion `13.1.1` ([manifest](../../package.json)). `bun run check`
passes with both adapters installed.

The existing prototypes do not yet compare the new required interaction:

- The dnd-kit adapter is 135 lines and already uses one `DragDropProvider`, Pane
  droppables, a handle for the top Sheet, a `DragOverlay`, and explicit
  cancellation
  ([implementation](../../src/playground/sheet-workspace/variants/dnd-kit-sheet-workspace.tsx)).
- The Pragmatic adapter is 156 lines and uses native `draggable`, Pane drop
  targets, a global monitor, and a custom native preview
  ([implementation](../../src/playground/sheet-workspace/variants/pragmatic-sheet-workspace.tsx)).
- Resolution Cards currently bypass both adapters. They use a separate,
  hand-written Pointer Events engine rendered through Motion
  ([Card integration](../../src/playground/sheet-workspace/sheet-workspace-presentation.tsx),
  [pointer engine](../../src/playground/card-demo/variants/motion-card-demo-interaction.tsx)).
  Therefore the existing Card-drop tests do not choose between dnd-kit and
  Pragmatic.
- The only adapter-specific browser assertion verifies that dnd-kit's compact
  top-Sheet overlay follows the pointer. It passes in Chromium. The shared
  Card/Panes highlight assertions pass on both routes, but exercise the shared
  Motion Card engine rather than either Sheet adapter
  ([E2E](../../e2e/sheet-workspace.pw.ts)).

This means “the current prototype works” is not decision evidence for the new
Card Tail interaction. The strongest local evidence is architectural: dnd-kit
already owns the React overlay needed for the desired morph, while Pragmatic's
prototype intentionally delegates that visual to a native preview.

## Implementation consequence of the recommendation

With dnd-kit:

1. Move the `DragDropProvider` above both the Pane board and the portaled
   Resolution Card layer.
2. Use one discriminated drag payload: `ResolutionCard` or `Sheet`.
3. For the front Card, connect its whole surface as the handle. For each back
   Card, keep the Card as the source element and connect only its exposed Tail as
   `handleRef`.
4. Render one content-independent `DragOverlay` in `"Card"` presentation.
5. On a valid Card drop, dispatch `OpenSheet`; on a valid placed-Sheet drop,
   dispatch `MoveTopSheet`. Do not mutate Sheet algebra during drag-over.
6. Animate a successful Card drop toward the measured destination Sheet. Honor
   reduced motion; the semantic commit and focus result must not depend on the
   animation completing.
7. Add a visible/focusable “Move to Pane…” action for every draggable Card and
   top Sheet. It calls the same command path and supplies the same announcement.

Delete the Pragmatic adapter and package, along with Motion and React Aria Sheet
workspace variants and their comparison-only tests. Keep Motion only where the
new presentation deliberately uses it; remove the old route-oriented Card demo
pointer engine after Card dragging has moved under dnd-kit.

## Acceptance gate

Before treating the choice as final, require:

- front-surface and each back-Tail drag tests;
- Card-to-empty-Pane and Card-to-occupied-Pane Sheet creation;
- top-Sheet cross-Pane movement and invalid/Escape cancellation;
- mouse, touch, keyboard drag, and click/tap move-menu parity;
- focus restoration and source/destination announcements;
- responsive phone and desktop Card-to-Sheet transitions;
- reduced-motion behavior;
- real iOS Safari and Android Chrome runs;
- a production-build chunk comparison after dead variants are removed.

If dnd-kit fails the real-device touch gate or its pre-1.0 churn becomes costly,
switch to Pragmatic without changing the Card/Sheet contract. The trade is known:
better native/framework-independent DnD in exchange for an application-owned
post-drop visual handoff and application-owned keyboard accessibility.
