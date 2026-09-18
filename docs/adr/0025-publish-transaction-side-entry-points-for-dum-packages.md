---
status: accepted
---

# Publish transaction-side entry points for Dum packages

Dumgen exposes `dumgen/authored` and `dumgen/validation`, and Dumdict exposes
`dumdict/planning`, as operational entry points that load neither Effect nor
promptsmith nor model execution. A host that runs inside a database
transaction or another short-lived isolate imports these instead of the
package roots: the authored catalog selectors and model-free grammatical
derivation, `validateEncounter`, and a synchronous `createDumdictPlanner`
that runs the same planners and slice validation as the Effect service over a
slice the host loaded itself. The package roots keep their existing exports,
so ADR-0014's frozen parser interface is unchanged; the new entry points are
additional locations, inventoried and budgeted like every other operational
surface.

The reason is isolate cost. tf-demo's mutation modules imported three pure
selection helpers and one validator from the dumgen root, which pulled the
whole generation runtime into every dictionary write; each such call paid
hundreds of milliseconds to evaluate a module a hundred times larger than the
code it ran. With the split, the generation runtime is reachable only from
node actions, and a test in tf-demo fails when any isolate module reaches it
again.

## Considered Options

- Tree-shaking the roots was not enough: the roots have module-level effects
  the bundler cannot drop, and the Effect service wrappers are reachable from
  every Dumdict planner export.
- An Effect-free storage port would have duplicated the service contract; a
  synchronous planner over a host-loaded slice reuses the planners as they
  are.

## Consequences

- The reviewed authored catalog remains the dominant weight behind
  `dumgen/authored`; a compact projection for transaction-side selectors is a
  separate decision.
- `tooling/dum-entrypoint-rss` inventories, benchmarks, and gates the three
  entry points like the others.
