---
status: accepted
---

# Give Dumgen an Effect core of services and Layers

Dumgen's operations were already Effects, but nothing they depended on was a
service. The transports, the request budget, the operation's call log and the
jev and Luna settings were threaded by hand through about two dozen
signatures, and the lab left Effect through `runPromise` and cached promises
itself ([#1268](https://github.com/clockblocker/texteater/issues/1268)).
Dumgen's core and its lab now use Effect services and Layers. This replaces
one rule of [#551](https://github.com/clockblocker/texteater/issues/551):
"services stay plain factories; no Layers for their own sake". The decisions
are on [#1269](https://github.com/clockblocker/texteater/issues/1269).

**Operations declare the services they need.** A public operation is
`Effect<A, ProviderFailure | InvalidModelOutput, Jev | Luna>`.
`segment.inUnits` needs `Jev` only, so its type shows that segmentation never
reaches Luna. The host provides one `DumgenLive(options)` Layer per action.
No `createDumgen` facade remains, so there is one way to build Dumgen.

**The German stages keep `ask: Ask`.** An `Ask` is already an Effect function
that needs nothing else, and the lab arms recombine it: asking once, pooling,
salted limit tests. The per-Sentence body builds its `Ask` from `Jev`; the
stages themselves don't read services.

**The lab runs on one runtime and one request budget.** Each lab process
holds one `ManagedRuntime`, and every run shares a single request budget of
12, the limit the segmentation lab already uses for cases. A run then has a
real cap and meets fewer rate limits. Waits and latencies in new run records
can't be compared with older ones; requests and outputs can.

**Time comes from Effect's `Clock`.** Nothing in `src` reads `Date.now` or
`performance.now`, so a `TestClock` pins every trace's times.

**`Config` stays out of `src`.** It pulls in Effect Schema, about 54 KB
minified, and reading the environment breaks the rule that production code
reads no environment. `cli/` may use it.

**Everything else from #551 and
[#858](https://github.com/clockblocker/texteater/issues/858) still holds:**

- No layer retries a model request.
- Each model call is one Effect that, when interrupted, aborts its transport
  and then waits for it to settle
  ([#554](https://github.com/clockblocker/texteater/issues/554)).
- A transport's throw is a `ProviderFailure`, a refused answer an
  `InvalidModelOutput`, and anything else a Defect
  ([#552](https://github.com/clockblocker/texteater/issues/552)).
- Every call emits a `dumgen.call` span and every operation a
  `dumgen.operation` span, beside its `OperationTrace`.
- The jev and Luna transports stay Promise ports that take an `AbortSignal`,
  and the host's side of the contract stays plain async.
- Effect stays out of Convex isolate modules
  ([ADR 0025](../../../../docs/adr/0025-publish-transaction-side-entry-points-for-dum-packages.md)).
- Zod stays, so there is no Effect Schema
  ([ADR 0013](../../../../docs/adr/0013-compile-zod-authored-schemas-into-package-owned-lightweight-validators.md)).
- Segmentation stays Luna-free.

## Considered Options

- Plain factories with Effect-returning methods, as #551 ruled. Rejected:
  hand-threaded dependencies are what the core is meant to remove.
- A `createDumgen` facade whose operations need nothing, beside exported
  services. Rejected: it leaves two ways to build Dumgen, and hides which
  operations need Luna.
- Stages that `yield* Jev` instead of taking `ask: Ask`. Rejected: it breaks
  the lab arms' recombinations, and it touches about 15 stage files and moves
  the segmentation lab's code hash.
- One request budget per lab attempt, as before. Rejected: a run has no real
  cap, and concurrent attempts hit more rate limits.

## Consequences

- tf-demo builds `DumgenLive` per action. Its `ClickResolution`,
  `KnowledgeProducer` and `IntakeDumgen` port types gain their services, in
  one landing with about ten tf-demo files.
- Test fakes stay plain async functions, provided as transports.
- Context, Layer and Clock add about 1.7 KB gzipped. Dumgen loads only in
  `"use node"` actions, so the isolate budget doesn't apply.
- Every slice that changes behaviour proves parity offline: requests and
  outputs stay identical, with no paid or live calls.
