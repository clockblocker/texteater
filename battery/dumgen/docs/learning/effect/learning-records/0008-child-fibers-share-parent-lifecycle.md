# Child fibers share their parent's lifecycle

The learner correctly stated that child fibers terminate with their interrupted parent. Refined precisely: Effect interrupts the children and waits for their finalizers, rather than abruptly killing them, so managed resources such as semaphore permits are released.

## Evidence

When asked what should happen to child provider fibers after a user cancels the parent upload fiber, the learner answered that the child dies with the parent.

## Implications

Structured-concurrency parentage is established. Future lessons can rely on interruption propagation while introducing finalizers, timeouts, and retry policy.
