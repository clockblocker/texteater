# Local concurrency bounds multiply across callers

The learner correctly calculated that twenty callers, each running a combinator with `concurrency: 16`, can create up to 320 active child operations. This establishes that a per-combinator limit does not protect shared provider capacity.

## Evidence

When asked whether the theoretical maximum was 16 or 320, the learner answered 320.

## Implications

Introduce one shared provider semaphore, its ownership in a live Layer, and the requirement that the Layer instance be reused rather than reconstructed per caller.
