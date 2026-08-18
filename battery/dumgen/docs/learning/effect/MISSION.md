# Mission: Effect-native Dumgen

## Why
Dumgen may need to process many user-uploaded texts and provider requests concurrently. Learn Effect well enough to decide whether making Dumgen Effect-native will give the pipeline materially better concurrency control, cancellation, retries, observability, and testability than its current Promise-based design.

## Success looks like
- Explain `Effect<Success, Error, Requirements>` and how an Effect differs from a Promise.
- Model Dumgen's Intake Batch and downstream resolution work with bounded concurrency and explicit failure semantics.
- Prototype an incremental Effect boundary around the existing OpenAI adapter without rewriting the domain model.
- Make an evidence-backed adopt / do-not-adopt decision and, if adopting, define a safe migration seam.

## Constraints
- The learner is an expert TypeScript programmer and an FP beginner; teach Effect through concrete Dumgen code, not category theory.
- Preserve Dumgen's domain boundaries, especially the Intake Batch and local Source Segmentation decisions.
- Dumgen targets Node 24+, Bun, TypeScript 7, the OpenAI SDK, and Zod.
- Effect v4 is currently a release candidate; choosing v3 or v4 is a separate explicit production decision.

## Out of scope
- A full Dumgen rewrite before a focused prototype proves value.
- Abstract FP terminology that does not unlock a concrete Effect capability.
- Treating in-process fibers as a substitute for durable queues or workflows across process restarts.
