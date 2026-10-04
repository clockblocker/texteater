# react-resizable-panels

Local workspace fork of [`bvaughn/react-resizable-panels`](https://github.com/bvaughn/react-resizable-panels), version 4.12.3.

The runtime source and unit tests in `lib/` are copied from upstream commit [`f9c422714a66e14f671a17f340a3560d8032fcdc`](https://github.com/bvaughn/react-resizable-panels/commit/f9c422714a66e14f671a17f340a3560d8032fcdc), the commit published as npm package `react-resizable-panels@4.12.3`. This battery retains the upstream MIT license in [LICENSE](./LICENSE).

Build output is written to `dist/`; the package root preserves the upstream `Group`, `Panel`, `Separator`, hooks, and type exports.

Biome excludes the imported `lib/` tree and copied Vitest setup so upstream style and import order remain comparable during future updates. Put locally authored extensions outside `lib/`. Local edits inside `lib/` only make it type-check under the repository's base compiler settings (`noUncheckedIndexedAccess`) and without Node types, because every consumer type-checks this package's source with its own settings.

The local `react-resizable-panels/workspace` entry point supplies the pure Pane reducer: Panes with a Ground beneath their Covers, Decks, and the Held Card of a Lift, generic over the Subject. Applications own the renderer. Terminology lives in [CONTEXT.md](./CONTEXT.md).
