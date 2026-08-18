# `yield*` is new syntax but sequential intuition is sound

The learner disclosed that `yield*` in `Effect.gen` is unfamiliar, while correctly predicting that successive yielded operations execute one after another. Future lessons should connect generator composition to familiar `await` semantics before introducing concurrency combinators.

## Evidence

When shown three successive Dumgen operations in `Effect.gen`, the learner said they did not know `yield*` but expected the operations to run sequentially.
