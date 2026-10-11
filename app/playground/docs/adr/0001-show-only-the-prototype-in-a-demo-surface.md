---
status: accepted
---

# Show only the prototype in a demo surface

Prototype/demo surfaces show only the thing being evaluated; explanation,
knobs and readouts live in a floating inspector outside the evaluated
surface. The surface renders only what the real app would render: no
labels, readouts, debug text or mode badges, no "clicked X" lines, counts,
container names or demo-only level badges, and no outlines or markers on by
default. Its own affordances stay: handles, grips, pin, expand, back,
forward, close, and tabs or switches the real app would have.

The inspector never covers what it controls. It sits on the side away from
where the demo's evaluated content appears: beside the frame, in the chrome
gutter, whenever the window has room for both, and floating over the frame
only when it hasn't, then on the far side from the lookup, pane or sheet.
Its trigger follows it. A demo says where its content appears with
`useInspectorAvoid`.

Every demo used to open with a caption strip, a row of controls and live
readouts inside the frame. At a phone width the strip took a third of the
frame, and in every frame it sat on top of the layout being judged, so the
user could not see the prototype as a reader would. A floating inspector
keeps the frame's full size for the prototype and keeps the controls live
next to it. A knob that only shows the evaluator something, such as an
outline around a component or a mark on covered lines, starts off.

## Consequences

A demo renders its explanation, its "try this" hints, its knobs and its
readouts through `<DemoInspector>`; the shell supplies the title,
description and inspiration from the registry. Borderline elements, such as
a pane's title line, stay only when a real app would show them.
