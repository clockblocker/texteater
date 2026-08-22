# Card-demo playground contract

This directory is an isolated interaction playground. Its lorem-ipsum
Segments and Resolution Chain cards are explicitly fake and must not be wired
to Convex, production navigation targets, Resolution Sessions, or Note data.
The Attestation → Surface → Lemma → Reading order is presentation layering,
not a durable relationship model.

## Variant seam

Each prototype owns exactly one adapter file under `variants/`:

- `native-card-demo-interaction.tsx`
- `motion-card-demo-interaction.tsx`
- `dnd-kit-card-demo-interaction.tsx`
- `gesture-spring-card-demo-interaction.tsx`

An adapter implements `CardDemoInteractionProps`, renders the supplied cards
with `CardDemoStackFrame` and `CardDemoCardView`, and calls
`onOpenNote(kind, origin)` after its own interaction engine decides that a card
should open. `origin` distinguishes an outside drop from direct keyboard or
double-tap activation. The registry, fixtures, routes, visual primitives,
geometry, and acceptance scenarios remain shared.

The stack element marked `data-card-demo-cancel-zone` is the cancel-zone
footprint. The active card marks `data-outside-cancel-zone="true"` while it is
outside so the common CSS grows it to two-thirds of the viewport. The route
shell owns the shared card-to-page morph, its reverse, reduced-motion behavior,
and fly-away dismissal; the four adapters continue to own only pointer and
gesture mechanics.

## Acceptance automation

`runCardDemoAcceptanceSuite` executes every shared scenario for every registered
variant. Browser automation supplies a `CardDemoAcceptanceDriver`; the scenario
runner owns the behavior sequence and matching route expectations so variants
cannot quietly test different contracts.
