---
status: proposed
---

# Intake owns Segments and Analysis Targets; closed-class identity is selected at intake

Intake produces, for every accepted sentence, the Segments a learner can
click and the Analysis Targets they belong to: one jev call per sentence
that answers membership for every ordered pair of resolvable Segments, one
route Choice per Segment, one role Choice per Segment, and one identity
Choice per Segment whose spelling enumerates authored DET, PRON or AUX
members. Click-time classification survives only as the fallback for a
target whose route mass favours Unresolved or whose identity is a Miss.

An Analysis Target is a flat group: ordered members with roles, one Route
Mass over bare Kinds, and, when the head enumerates authored candidates, one
Identity Mass over headword groups. Nothing resolved is stored. One pure
Resolution Selector turns the masses into a route, a Family, and an Identity
State per member.

Closed-class identity is selected from the authored candidates a spelling
enumerates, not classified first and located by features afterwards. The
Choice offers one option per authored member with the cell described in
syntactic terms; the mass is summed per headword group (Kind, headword,
pronoun type) and the cell stays a grammar question. Identity implies route:
a Selected head's Kind replaces the route vote for that target. A non-head
role inherits its parent's route: the article inside a NOUN target, the
auxiliary, expletive or reflexive inside a VERB target, any member of a
Phraseme. Their identities are Derived by code from the head's grammar and
the target's shape (ADR 0024 for the article, the derivation rules of the
intake lab for the auxiliary), never asked and never stored.

The numbers, measured in `battery/dumgen/prototypes/intake/` (README) on
2026-09-18 to 2026-09-21, one jev call per sentence:

- Membership as a symmetrized matrix with a group route vote at tau 0.6
  passes 157 to 162 of 206 classification clicks against 146 for the
  shipped one-call-per-click design measured the same day; spread about 7.
  Hierarchical Family-then-Kind routing collapses to 88 and is rejected.
- Rules in the state, not in the questions: the questions shape costs 4.5
  times the input tokens and loses 13 to 22 clicks.
- Identity from candidates: headword and Kind right for 186 of 212 lemma
  gold cases with the cell rubric (178 with bare features, 179 to 180 with
  headword groups); the exact cell 154 to 162, and no shape moves it. On
  190 closed-class gold clicks the selected identity's Kind is right 165
  times, the route vote 136. Miss rate 1 to 3 percent of closed-routed
  occurrences; the table lacks `den`, `dem`, `des`.
- Roles: reflexive and expletive 100 percent, governed preposition 9 to 10
  of 14, owned article 22 to 23 of 29 projectable; separable prefixes stay
  grammar (8 of 11 gold prefixes are bound in the word). Asking roles does
  not move membership.
- Auxiliary Reading and the target's perfect, future and passive derive from
  shape with 0 mismatches on 22 verb targets and 18 AUX cases; the one fork
  (`sein` plus participle without `worden`) is lexical.

## Considered Options

- Classify at click, then locate the authored identity by features. This is
  the shipped order. It pays about 310 ms per click for a Kind the identity
  Choice gets right more often, and it cannot see a fused article or a
  discontinuous verb until the click lands on the right word.
- A per-member identity distribution on every closed-class member. Rejected
  on the derivation lab: auxiliary and article identities follow from the
  head with no misses, so a distribution would only be a second place for
  the same answer to disagree.
- Headword groups as the Choice options. Same headword accuracy with half
  the options, but the grouped rubric hides the per-use AUX Readings and
  loses the DET-twin cue the cell description carries. Kept as the storage
  key, not as the option.
- Rules inside each question. Rejected on cost and accuracy.

## Consequences

- Dumgen ADR 0001 is amended a second time: the intake call judges
  language, validity and stitching per sentence as before, and now also
  produces the Segmented Sentence; deterministic Source Segmentation stays
  its first internal step (ADR 0004).
- ADR 0015's Catalog Miss gains an observable intake form: a closed-class
  route with no candidate, reported per spelling.
- Grammar features run at click for the clicked target only. The
  classification call leaves the click path for every target intake could
  place; Selected identities show authored Knowledge with zero calls.
- Corpora gain offset-keyed sentence gold and abbreviation cases (#495); the
  classification corpus keeps its click cases as probes into the sentence.
- Production wiring is a separate effort: persisting Segmented Sentences and
  Attestation Membership by offset, the reader's tones for Identity States,
  live latency. Its boundary is in `docs/reference/intake-owned-units.md`.

Decided on the map
[Wayfinder: intake-owned Pieces and Units](https://github.com/clockblocker/texteater/issues/487)
and its tickets, 2026-09-19 to 2026-09-21. Awaiting the playground verdict on
#496 before acceptance; its findings are recorded in the spec.
