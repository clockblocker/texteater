# Public Dumgen operations should return Effects

The learner correctly identified that Dumgen's three public operations should return Effect values so a caller can compose them into one parent program with `Effect.gen`, while retaining ownership of execution at the application boundary.

## Evidence

When asked what the operations must return to share caller-owned runtime policy, the learner connected the Effect-returning interface directly to generator-based composition.

## Implications

The next lesson should distinguish sequential composition through successive `yield*` expressions from explicit concurrency through combinators such as `Effect.all` and `Effect.forEach`.
