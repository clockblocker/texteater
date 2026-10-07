# compass

The state and layout primitives of the Compass workspace. tf-demo's
`src/workspace/compass/` holds the renderer and Motion; this battery holds
what that renderer draws from.

- `compass`: the pure Pane model and its geometry, free of React. The reducer
  keeps Panes with a Ground beneath their Covers, Decks, and the Held Card of
  a Lift, generic over the Subject an application presents.
- `compass/panels`: the React layout components `Split`, `SplitRegion` and
  `SplitHandle`, which divide the workspace between Panes and resize them.
  lego's `Resizable*` atoms give them their look.

Terminology lives in [GLOSSARY.md](./GLOSSARY.md).

`src/panels/` is forked from react-resizable-panels 4.12.3, upstream commit
f9c42271, on 2026-09-08, and keeps its MIT [LICENSE](./LICENSE).
