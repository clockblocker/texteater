# Unresolved relation targets

> **Superseded terminology:** This document predates ADR 0002 and is retained
> as pre-refactor design history. Use `battery/dumdict/CONTEXT.md` and the
> generated package README for the current Lemma/Reading model and API.

An unresolved target is not a Linguistic Entry. The system knows a descriptive
tuple but has not established an opaque Entry identity.

```ts
type PendingEntryIdentity<L> = {
  language: L;
  citationForm: string;
  entryFamily: LinguisticEntryFamilyFor<L>;
  entrySubkind: LinguisticEntrySubkindFor<L, LinguisticEntryFamilyFor<L>>;
};
```

`derivePendingEntryId` deterministically encodes that tuple for deduplication
and cleanup bookkeeping. The resulting ID is a pending-work identity only. It
must never be used as a `LinguisticEntryId`.

Several real Lemmas may match one pending description. Current Dumdict code
chooses one deterministically for the forward edge and fans the inverse across
Readings of every exact match. Contextual refinement is deferred.

Lexical pending relations originate at a Meaning ID. Morphological pending
relations originate at a Linguistic Entry ID. This preserves the same ownership
boundary used by resolved relations.
