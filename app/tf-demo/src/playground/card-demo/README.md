# Card-demo playground contract

This directory is an isolated interaction playground. Its lorem-ipsum
Segments and Resolution Chain cards are explicitly fake and must not be wired
to Convex, production navigation targets, Resolution Sessions, or Note data.
The Attestation → Surface → Lemma → Reading order is presentation layering,
not a durable relationship model.

## Interaction implementation

The playground uses the Motion adapter in
`variants/motion-card-demo-interaction.tsx`. It implements
`CardDemoInteractionProps`, renders the supplied cards with
`CardDemoStackFrame` and `CardDemoCardView`, and calls
`onOpenNote(kind, origin)` after Motion decides that a card should open.
`origin` distinguishes an outside drop from direct keyboard or double-tap
activation.

The fixtures, routes, visual primitives, geometry, and acceptance scenarios
remain separate from the Motion-specific interaction mechanics.

The stack element marked `data-card-demo-cancel-zone` is the cancel-zone
footprint. The active card marks `data-outside-cancel-zone="true"` while it is
outside so the common CSS grows it to one-third of the viewport. The route
shell owns the card-to-page morph, its reverse, reduced-motion behavior, and
fly-away dismissal; the Motion adapter owns pointer and gesture mechanics.

## Acceptance automation

`runCardDemoAcceptanceSuite` executes every scenario against Motion. Browser
automation supplies a `CardDemoAcceptanceDriver`; the scenario runner owns the
behavior sequence and matching route expectations.
