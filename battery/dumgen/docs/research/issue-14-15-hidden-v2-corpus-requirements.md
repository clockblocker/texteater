# Hidden v2 corpus requirements for issues #14 and #15

Status: primary-source checklist used to freeze evaluator fixtures before
inference on 2026-07-31.

## Segmentation Chain

[#15](https://github.com/clockblocker/texteater/issues/15) requires an unseen,
versioned corpus retaining the complete
[#3 evaluation contract](https://github.com/clockblocker/texteater/issues/3):
all three Intake Decisions; exact authoritative replacement; ordered boundary
and kind spans; derived clickability; typo/variant preservation; conservative
structural reconstruction without abbreviation expansion; accepted local
`OpaqueText`; Hebrew non-whitespace-delimited atoms; and canonical immutable
ID/local-index validity. #15 also makes hidden-corpus results the only
selection evidence and forbids prompt changes after observing failures.

The frozen fixture is
[`segmentation-chain-v2-hidden`](../../prototypes/issue-15-segmentation-chain-v2-hidden/README.md).

## Learner Meaning Resolution

[#14](https://github.com/clockblocker/texteater/issues/14) requires Entries and
contexts unseen in the
[#8 development corpus](https://github.com/clockblocker/texteater/issues/8),
broad-reuse and distinct-note controls, zero/one/multi inventories, paired
candidate-order permutations, misleading candidate fields, and exact canonical
new drafts. The unchanged gate is zero invalid output, perfect decision and
reuse-ID accuracy, exact emoji and ordered description blocks, and zero false
splits or false merges. Candidate learner ownership and resolved Entry scope
remain application-validated; Meaning classification may not revisit Entry
identity, consistent with the
[identity ADR](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md).

The frozen fixture is
[`meaning-resolution-v2-hidden`](../../prototypes/issue-14-meaning-resolution-v2-hidden/README.md).
