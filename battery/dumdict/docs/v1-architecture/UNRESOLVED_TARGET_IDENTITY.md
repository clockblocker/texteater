# Unresolved Target Identity Problem

## Core Problem

`dumdict` currently models an unresolved relation target as a `PendingLemmaRef`
and derives its identity by pretending it is a lemma.

This is the wrong abstraction.

An unresolved target is not a lemma:

- it is not a full sense
- it does not have full `dumling` identity
- it does not deserve lemma-shaped semantics
- it should not be forced through lemma parsing and lemma ID derivation

The current model treats "not yet disambiguated" as if it were "a special kind
of lemma". That leaks into both naming and behavior.

## Where The Model Leaks Today

### DTO naming

The pending DTOs are explicitly lemma-shaped:

- `PendingLemmaId`
- `PendingLemmaIdentity`
- `PendingLemmaRef`
- `PendingLemmaRelation`

See [pending.ts](/Users/annagorelova/work/dumdict/src/dto/pending.ts:9).

This names the unresolved target as a lemma even though the whole problem is
that we do not yet have a full lemma identity.

### Identity derivation

Pending identity is currently derived by constructing a synthetic lemma:

- `canonicalLemma`
- `lemmaKind`
- `lemmaSubKind`
- `inherentFeatures: {}`
- `meaningInEmojis: "pending"`

Then that synthetic lemma is passed through `parse.lemma(...)` and
`makeDumlingIdFor(...)`.

See [identity.ts](/Users/annagorelova/work/dumdict/src/core/pending/identity.ts:15).

This means unresolved-target identity is currently expressed as:

- "make up a fake lemma"
- "give it fake discriminator values"
- "derive a lemma ID from that fake lemma"

That is the architectural smell.

### Architecture docs

The existing storage-facing spec currently says:

- pending refs are `PendingLemmaRef`
- pending identity is a `PendingLemmaIdentity`
- pending ID derivation must use `dumling` lemma identity rules

See [STORAGE_FACING_SPEC.md](/Users/annagorelova/work/dumdict/docs/v1-architecture/STORAGE_FACING_SPEC.md:232).

This encodes the same idea at the spec level: unresolved targets are described
through lemma semantics rather than through their own domain concept.

## Why This Is Painful

### 1. It collapses unresolved targets too early

The current pending identity keeps only:

- `canonicalLemma`
- `lemmaKind`
- `lemmaSubKind`

and discards full-sense identity.

That is exactly why multiple future senses with the same spelling collapse into
one pending bucket.

### 2. It creates fake confidence

By turning an unresolved target into a synthetic lemma, the code makes it look
more resolved than it really is.

But the missing information is the whole point:

- which sense?
- which discriminator?
- which full `dumling` identity?

The current model hides that uncertainty inside a fake lemma-shaped object.

### 3. It couples unresolved-target identity to lemma internals

Right now unresolved-target identity depends on:

- lemma parsing
- lemma ID derivation
- synthetic lemma payload choices such as `meaningInEmojis: "pending"`

That makes unresolved-target identity feel like a hacked-down lemma identity
instead of its own first-class concept.

### 4. It encourages the wrong workflow

Once unresolved targets are treated as degraded lemmas, it becomes tempting to
do automatic pickup by mechanical identity match.

That is the flow now being moved out of `dumdict`.

The cleanup work makes the underlying problem visible:

- unresolved target identity is not a real sense identity
- therefore sense resolution should not be hidden inside lemma-shaped matching

### 5. It pollutes terminology

The code and docs currently force readers to think in terms like:

- pending lemma
- pending lemma identity
- pending lemma pickup

But the object is not a lemma. It is an unresolved target of a relation.

That mismatch makes the architecture harder to think about correctly.

## What This Doc Is Claiming

This doc does not propose the replacement design.

It only records the problem clearly:

- unresolved relation targets should have their own named concept
- treating them as lemmas is a modeling mistake
- current pending identity is a workaround, not a clean domain abstraction
- the workaround directly contributes to the collapsed-bucket and auto-pickup
  problems

## Current Symptoms To Keep In Mind

Any future redesign should explicitly address these symptoms:

- unresolved targets should not need fake lemma discriminators
- unresolved-target identity should not require constructing a synthetic lemma
- unresolved-target naming should not claim that the object is already a lemma
- unresolved-target storage should not imply full-sense identity where none
  exists
- cleanup/disambiguation workflows should operate on unresolved targets as
  unresolved targets, not as degraded lemmas

## Constraint For Future Work

Whatever replaces the current pending model should preserve one important
property:

- unresolved targets are still first-class relation endpoints
- they are still distinct from real stored lemmas
- they still support deterministic storage identity

The problem is not that unresolved targets have IDs.

The problem is that their IDs are currently defined by pretending the target is
already a lemma.
