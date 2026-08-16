# Interrupted children return semaphore permits

The learner correctly stated that a semaphore permit held by a child fiber is returned when its parent is cancelled. This demonstrates the resource-safety consequence of Effect interruption and finalization.

## Evidence

When asked whether the held permit was leaked or returned after parent cancellation, the learner answered returned.

## Implications

Concurrency, structured cancellation, and permit finalization are established. Move to typed failures and retry policy.
