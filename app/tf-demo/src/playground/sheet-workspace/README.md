# Card and Sheet workspace fixtures

The reusable module lives in `src/workspace/`. Its interface accepts Text and
Note subjects, a renderer that receives only `Card` or `Sheet` presentation,
and a subject-owned Card Tail renderer. It owns Pane-local Card Layers,
dnd-kit sessions, Sheet controls, and the handoff between transient Cards and
placed Sheets. Pure Sheet Stack algebra remains in `sheet-workspace.ts`; Card
Layers remain separate transient state.

These static fixtures remain test support for the pure workspace algebra and
application Text, Reading, and Route Note presentations. They are not mounted
by the application and have no URL.

Card Layers are replaced by a new selection in the same Pane and dismissed by
Escape, their close control, unoccupied Pane clicks, or when their originating
Sheet is hidden, moved, or removed. Moving the final Card into a Sheet Stack
also removes the layer. A Card released over its own Card Layer returns to its
original place without changing the deck order. The foremost Card drags from
its full surface; each occluded Card drags from its Note-owned Tail. Dragging a
Sheet reveals removal zones near the bottom of every Pane; releasing over one
performs Explicit Sheet Removal, including for a Locked Sheet.

Production integration lives in `src/App.tsx` and uses the workspace controller
with live Convex views. Deferred work remains final Tail designs, nested Card
commands, exact shortcut and non-pointer placement design, and
presentation-specific Note blocks.
