# Effect for Dumgen Resources

## Knowledge

- [Effect v4: The Effect Type](https://www.effect.website/docs/v4/getting-started/the-effect-type)
  Primary explanation of lazy Effect values and the `Effect<Success, Error, Requirements>` type. Use for the core mental model.
- [Effect v4: Creating Effects](https://www.effect.website/docs/v4/getting-started/creating-effects)
  Official constructors, including `Effect.tryPromise` for wrapping rejecting Promise APIs. Use at the OpenAI SDK boundary.
- [Effect v4: Running Effects](https://www.effect.website/docs/v4/getting-started/running-effects)
  Official runtime boundaries, including `Effect.runPromise`. Use when deciding where Dumgen enters and exits Effect.
- [Effect v4: Using Generators](https://www.effect.website/docs/v4/getting-started/using-generators)
  Official `Effect.gen` and `yield*` composition guide. Use to translate existing `async` orchestration without teaching unrelated FP abstractions first.
- [Effect v4: Basic Concurrency](https://www.effect.website/docs/v4/concurrency/basic-concurrency)
  Official bounded and unbounded concurrency options for combinators such as `Effect.all` and `Effect.forEach`. Use for multi-upload orchestration.
- [Effect v4: Fibers](https://www.effect.website/docs/v4/concurrency/fibers)
  Official model of fibers as lightweight virtual threads and running Effect instances. Use for structured concurrency, interruption, and parent-child lifecycles.
- [Effect v4: Semaphore](https://www.effect.website/docs/v4/concurrency/semaphore)
  Official permit-based coordination with guaranteed permit release on failure or interruption. Use for shared provider capacity and weighted limits.
- [Effect v4: Managing Services](https://www.effect.website/docs/v4/requirements-management/services)
  Official service requirements and provisioning model. Use to make shared provider capacity a typed Dumgen dependency.
- [Effect v4: Managing Layers](https://www.effect.website/docs/v4/requirements-management/layers)
  Official construction and composition of live service implementations. Use to create provider capacity and credentials once at the application boundary.
- [Effect v4: Layer Memoization](https://www.effect.website/docs/v4/requirements-management/layer-memoization)
  Official sharing rules for Layer instances. Use to avoid accidentally constructing one semaphore per request.
- [Effect v4: Retrying](https://www.effect.website/docs/v4/error-management/retrying)
  Official retry policies and schedules. Use only after Dumgen distinguishes transient failures from permanent failures.
- [Effect v4: Two Types of Errors](https://www.effect.website/docs/v4/error-management/two-error-types)
  Official distinction between expected typed failures and unexpected defects. Use when deciding which Dumgen outcomes belong in the error channel.
- [Effect v4: Expected Errors](https://www.effect.website/docs/v4/error-management/expected-errors)
  Official creation and composition of typed errors. Use for Dumgen's provider and validation failure algebra.
- [Effect v4: Timing Out](https://www.effect.website/docs/v4/error-management/timing-out)
  Official typed timeout behavior. Use when setting provider and whole-workflow latency budgets.
- [Effect v3 documentation](https://www.effect.website/docs/v3/getting-started/introduction/)
  Stable-major documentation. Use when comparing the migration cost of stable v3 with the v4 release candidate.
- [Effect GitHub repository](https://github.com/Effect-TS/effect)
  Primary source and release history. Use when documentation is ambiguous or the v4 API is changing.

## Wisdom (Communities)

- [Effect Discord](https://discord.gg/effect-ts)
  The official practitioner community. Use to pressure-test a proposed Dumgen migration seam and learn current v3-to-v4 production experience.

## Gaps

- A Dumgen-specific load profile: expected uploads per second, sentences per upload, provider rate limits, acceptable queueing latency, cancellation rules, and restart durability.
- A measured Promise baseline against which an Effect prototype can be compared.
