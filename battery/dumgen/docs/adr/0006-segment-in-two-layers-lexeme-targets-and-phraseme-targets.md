---
status: accepted
---

# Segment in two layers: Lexeme Targets and Phraseme Targets

Intake analyses every accepted German sentence in two layers, both asked in
one jev call over one tagged sentence. The Lexeme layer partitions the
ResolvableText Segments into Lexeme Targets: the Segments that realize one
word, with a Member Role each, one Route Mass over Lexeme Kinds and, for a
closed-class head, an Identity Mass over authored headword groups. The
Phraseme layer partitions a subset of the Lexeme Targets into Phraseme
Targets: the words that are fixed lexical members of one expression, with one
Kind Mass and a fixedness score. A Phraseme never lists a Segment; its span is
derived from its member words, so `zur Verfügung stellen` covers `r` through
the noun that owns it. A click selects the largest unit containing the
Segment, and the words beneath a Phraseme are reached from it.

Two relations, two predicates. Grammatical realization (an article, an
auxiliary, a particle, a governed preposition realizing one word) is asked
under the realization rules; lexical fixedness (a word being a restricted
member of an expression) is asked under the fixedness rules in a second
state field. The flat partition of ADR 0005 asked one question for both and
made a word compete with the expression around it for the same route mass.

Invariants live in code, never in a question: one Head per Lexeme Target (a
group the matrix glued around two Heads is split at them), a NOUN keeps at
most the one article opening its phrase, a fused word never joins a group
whole (its adposition is a singleton ADP, its article the next noun's), and
the fixedness Score establishes an expression while the Kind Choice only
names it.

Funktionsverbgefüge are Collocations: `eine Entscheidung treffen`, `eine
Frage stellen`, `zur Kenntnis nehmen`, `zur Verfügung stellen` are Phraseme
Targets over their verb and noun, with free arguments outside. This reverses
the issue 82 reading that conventionality alone is not fixedness, which the
click corpus had encoded; system ADR 0028 records the ruling.

The numbers, measured in `battery/dumgen/prototypes/intake/` (README, "Two
layers") on 2026-09-21, 238 evaluation clicks, one run each:

- The Lexeme layer alone, shipped wording with only the Phraseme and Fusion
  sentences removed from the criteria: 164 against 167 for the flat design,
  members correct 172 against 173, inside the run-to-run spread.
- Both layers: 156 to 159, and 10 of the 17 Phraseme gold clicks pass where
  the flat design reached 3 to 7. Six of the lost clicks were the
  Funktionsverbgefüge gold the ruling above moved to Collocation.
- Rewriting the realization wording collapses membership to 114 while the
  role answers stay right; the shipped wording stays verbatim.
- The second layer costs 29 questions and 4.2k input tokens per sentence;
  latency is flat.

## Considered Options

- One flat partition with Phraseme Kinds in the route inventory (ADR 0005).
  It cannot represent a word inside an expression, put three Heads in one
  target, labelled a fused article a governed preposition, and never fired
  Collocation. Superseded on the nesting clause; everything else in ADR 0005
  stands.
- Two jev calls, the second seeing the words as a list. The docs' dependent
  question pattern; deferred, since the projection by Head builds the
  second layer from answers asked against the same state in one call.
- Arbitrary nesting. Rejected: two layers are the two Families that compose,
  and a Morpheme layer below Segments would be a third with the same shape,
  not a tree.

## Consequences

- `analyzeSentence` joins the Dumgen interface: one German sentence in, a
  Sentence Analysis out (`sentenceId`, Stitched Text, offset-keyed Segments
  with surface, Lexeme Targets, Phraseme Targets, Fusions). The Resolution
  Selector ships with the package; `resolvedUnitAt` is what a host reads at
  click time. `classifyTarget` stays as the fallback for an Unresolved unit
  and gains `Phraseme/Collocation` while `Construction/Fusion` leaves it
  (ADR 0027).
- The click corpus rules the support-verb sentences Collocation and the
  fused-word sentences ADP. The sentence corpus (`sentence-analysis/de`)
  carries offset-keyed gold for both layers and is an operation experiment.
- ADR 0005's "targets do not nest" and "sub-unit gold is not authored" are
  superseded: a Phraseme Target nests exactly one layer of Lexeme Targets,
  and the Phraseme layer has its own gold.
- tf-demo stores the Sentence Analysis beside the sentence and reads it at
  selection time; a click that lands on a resolved unit skips classification.

Decided on the map
[Wayfinder: intake-owned Pieces and Units](https://github.com/clockblocker/texteater/issues/487),
2026-09-21, after the lab and the playground at `/playground/lattice`.
