# compass

The state and layout primitives of the Compass workspace. tf-demo's
`src/workspace/compass/` holds the renderer and Motion; this battery holds
what that renderer draws from.

- `compass`: the pure Pane model and its geometry, free of React. The reducer
  keeps Panes with a Ground beneath their Covers, Decks, and the Held Card of
  a Lift, generic over the Subject an application presents.
- `compass/panels`: the React layout components that split a Pane's space and
  resize it.

Terminology lives in [CONTEXT.md](./CONTEXT.md).

`src/panels/` is forked from react-resizable-panels 4.12.3, upstream commit
f9c42271, on 2026-09-08, and keeps its MIT [LICENSE](./LICENSE).
