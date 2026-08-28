# tf-demo playground

The playground is the application-independent home for deterministic UI
experiments. Open `/playground` for the registry or
`/playground/<experiment-id>` for a stable experiment URL. Playground routes do
not initialize Convex, so fixture-only experiments can run with Vite alone.

## Add an experiment

1. Create a directory under `src/playground/<experiment-id>/`.
2. Export a component that owns its fixture state and renders the experiment.
3. Register its ID, copy, and component in `playground-registry.tsx`.
4. Add interaction tests beside the package tests or in `e2e/` when browser
   behavior matters.

Keep product-agnostic interaction code in the relevant application or package
module. The playground should own only fixtures, harnesses, comparison variants,
and acceptance evidence. Disable browser persistence unless persistence itself
is the subject of the experiment, and provide deterministic reset behavior.
