# react-resizable-panels

Local workspace fork of [`bvaughn/react-resizable-panels`](https://github.com/bvaughn/react-resizable-panels), version 4.12.3.

The runtime source and unit tests in `lib/` are copied from upstream commit [`f9c422714a66e14f671a17f340a3560d8032fcdc`](https://github.com/bvaughn/react-resizable-panels/commit/f9c422714a66e14f671a17f340a3560d8032fcdc), the commit published as npm package `react-resizable-panels@4.12.3`. This battery retains the upstream MIT license in [LICENSE](./LICENSE).

Build output is written to `dist/`; the package root preserves the upstream `Group`, `Panel`, `Separator`, hooks, and type exports.

Biome excludes the imported `lib/` tree and copied Vitest setup so upstream style and import order remain comparable during future updates. Put locally authored extensions outside `lib/`.

The local `react-resizable-panels/workspace` entry point supplies the Card/Sheet state model and controlled React renderer. Import `react-resizable-panels/workspace.css` for its presentation styles. The playground in tf-demo exercises this API; terminology lives in [CONTEXT.md](./CONTEXT.md).
