# `Effect.all` and `Effect.forEach` distinguished

The learner correctly chose `Effect.forEach` for processing an array of Intake Batch values with one shared `processIntakeBatch` Effect-producing function. This demonstrates the operational distinction: `all` combines Effect values already in hand, while `forEach` maps values through one Effect-producing recipe and combines the results.

## Evidence

Given `intakeBatches`, `processIntakeBatch`, and a concurrency option, the learner supplied `forEach` and connected it to the concrete example.

## Implications

Move from per-combinator concurrency limits to provider-wide shared capacity across multiple caller programs.
