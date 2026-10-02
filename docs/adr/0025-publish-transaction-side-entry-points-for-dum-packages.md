---
status: accepted
---

# Publish transaction-side entry points for Dum packages

Dumdict exposes `dumdict/planning` and dumspec exposes `dumspec/inventories`
as operational entry points that load neither Effect nor promptsmith nor
model execution. A host that runs inside a database transaction or another
short-lived isolate imports these instead of the package roots:
`dumdict/planning` holds a synchronous `createDumdictPlanner` that runs the
same planners and slice validation as the Effect service over a slice the
host loaded itself, and `dumspec/inventories` holds the Authored Inventories
with the pure selectors over them, model-free grammatical derivation
included. Validation is Dumling's `parseUnit`, which the Dumling root exports
without Zod. Dumgen has no transaction-side entry point: its operations call
models, so only node actions load it. The package roots keep their existing
exports, so ADR-0014's frozen parser interface is unchanged; the entry points
are additional locations.

The reason is isolate cost. A pure helper imported from a package root that
also holds the generation runtime pulls that runtime into every dictionary
write, and each such call pays hundreds of milliseconds to evaluate a module a
hundred times larger than the code it runs. With these entry points, the
generation runtime is reachable only from node actions, and a test in tf-demo
fails when any isolate module reaches it again.

## Considered Options

- Tree-shaking the roots was not enough: the roots have module-level effects
  the bundler cannot drop, and the Effect service wrappers are reachable from
  every Dumdict planner export.
- An Effect-free storage port would have duplicated the service contract; a
  synchronous planner over a host-loaded slice reuses the planners as they
  are.
- A Dumgen entry point for the authored selectors, beside its Effect runtime,
  was rejected in [#863](https://github.com/clockblocker/texteater/issues/863):
  the selectors are pure functions over dumspec's data
  ([ADR 0041](./0041-record-in-dumling-only-what-routing-and-drill-down-consume.md)),
  tf-demo's transaction and Dumgen's `resolve.grammar` share one copy of them,
  and a side entry would risk sharing a bundle chunk with the runtime.

## Consequences

- The Authored Inventories
  ([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md))
  are the dominant weight behind `dumspec/inventories`. A compact projection
  for transaction-side selectors is a separate decision.
- `tooling/dum-entrypoint-rss` inventories, benchmarks, and gates
  `dumdict/planning` like the other entry points. dumspec's package test
  fails when `dumspec/inventories` imports another package at runtime, and
  tf-demo's isolate test budgets the Dum package bytes each isolate module
  loads.
