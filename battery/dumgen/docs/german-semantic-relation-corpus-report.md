# German Semantic Relation Corpus Report

This report records the retained route-local corpus built for
[texteater#190](https://github.com/clockblocker/texteater/issues/190). The
semantic oracle is Dumrel's
[German Semantic Relation Judgment Contract](../../dumrel/docs/german-semantic-relation-judgment-contract.md).
External factual classifications are checked in the
[primary-source review](./german-semantic-relation-primary-sources.md); that
review distinguishes source-settled evidence from project reviewer judgments.

## Selections and disclosure gate

| Selection | Cases | State |
| --- | ---: | --- |
| Demonstrations | 2 | Disclosed; each teaches a distinct boundary (`Pfote` and converse Near Antonym). |
| Development basic | 5 | Disclosed easy wins. |
| Development adversarial | 45 | Disclosed adversarial tests. |
| Untouched acceptance | 12 reserved, 0 revealed | Sealed pending approval by at least one human. |

The three selections are disjoint by corpus identity, exact input fingerprint,
and declared contamination key. The acceptance identities and contamination
keys are committed in the corpus but the review API withholds every reserved
identity, input, and judgment until human approval consumes the one-shot seal.

## Coverage

The 50 disclosed tests request only Dumgen's six direct relation kinds.
Hyponym and Meronym are represented by seven written inverse judgments in the
adjudication metadata and are never present in a model request or ideal output.

### Requested relation leaves

| Relation | Test cases requesting it |
| --- | ---: |
| Synonym | 50 |
| Near Synonym | 43 |
| Antonym | 44 |
| Near Antonym | 44 |
| Hypernym | 26 |
| Holonym | 21 |

Across those requests, the ideals contain 62 accepted targets and 166 explicit
`null` leaves. The adjudication registry also records 34 explicitly harmful
targets, one bounded acceptable alternative target set, and seven inverse
Hyponym/Meronym judgments.

### German applicability routes

Every Family/Kind route for which Dumrel requests at least one Semantic
Relation appears. Each retained case requests the complete default relation
set for its route, so this table also covers every requested relation × route
cell.

| Family/Kind | Cases | Family/Kind | Cases |
| --- | ---: | --- | ---: |
| Lexeme/ADJ | 6 | Lexeme/ADP | 2 |
| Lexeme/ADV | 2 | Lexeme/AUX | 1 |
| Lexeme/CCONJ | 1 | Lexeme/DET | 1 |
| Lexeme/INTJ | 1 | Lexeme/NOUN | 16 |
| Lexeme/NUM | 1 | Lexeme/PART | 1 |
| Lexeme/PRON | 1 | Lexeme/PROPN | 5 |
| Lexeme/SCONJ | 1 | Lexeme/SYM | 1 |
| Lexeme/VERB | 5 | Phraseme/Aphorism | 1 |
| Phraseme/Collocation | 1 | Phraseme/DiscourseFormula | 1 |
| Phraseme/Idiom | 1 | Phraseme/Proverb | 1 |

Lexeme/PUNCT, Lexeme/X, Morpheme kinds, and Construction/Fusion are absent
because German applicability requests no Semantic Relation for those routes.
They appear only as explicitly harmful target shapes where useful.

### Failure modes

Tags overlap because one adversarial case can exercise several boundaries.

| Failure mode | Tagged tests |
| --- | ---: |
| Positive target | 15 |
| Negative/rejected proposal | 20 |
| Defensible `null` | 8 |
| Material omission | 6 |
| Wrong target Kind or relation kind | 18 |
| Wrong target Family | 5 |
| Polysemy/source-Reading leak | 11 |
| Register or distribution | 7 |
| Multi-member source or target | 7 |
| Self-relation | 3 |

Fourteen tests are anchored directly to the cited primary-source review.
Thirty-six are explicitly marked `contract-reviewer`: their hard judgment is
the project's application of the frozen contract, not a claim that a dictionary
uses Dumrel's exact label. This distinction is especially important for exact
Synonym, Near Antonym mappings of converse relations, usefulness-driven nulls,
and granularity choices.

## Defects found in the previous combined corpus

The replaced corpus and evaluator had these defects:

1. It had four demonstrations, nine development cases, and four already
   visible acceptance cases rather than a 50-test relation benchmark plus a
   human-gated untouched reservation.
2. Relation evaluation was entangled with transcription, definition, and
   translation fixtures. Several examples primarily tested those other aspects
   and contributed no relation boundary.
3. Most cases had no rationale, contamination key, explicitly harmful target,
   evidence status, inverse judgment, or acceptable-alternative record.
4. `laufen → sich fortbewegen` used `Phraseme/Collocation` as a Hypernym target,
   contradicting the frozen `VERB → VERB` shape.
5. `und → oder` was labeled strict Antonym. The retained corpus treats this as
   the reviewer-adjudicated Near Antonym coordination contrast.
6. The financial `Bank` ideal simultaneously treated related institution terms
   as Synonym, Near Synonym, and Hypernym without cited boundaries. Primary
   lexicography treats `Bank` and `Kreditinstitut` synonymously, so the retained
   case rejects the contested Hypernym claim.
7. `eins → ein` risked encoding an inflection/surface or same-Lemma relation;
   the new numeral case makes the self/surface prohibition explicit.
8. `auf jeden Fall → definitiv` was labeled exact Synonym despite grammatical
   and discourse-role restrictions; the retained case uses Near Synonym.
9. The old `u. a.` all-null ideal offered no written adjudication and could be
   misread as a null inferred from dictionary silence. Retained nulls are
   explicitly contract-reviewer judgments.
10. The evaluator computed `relationTargetsPass` but omitted it from
    `contractPass`. A fluent response could therefore pass the contract while
    returning wrong, harmful, or omitted relation targets. This corpus records
    the bounded alternatives and harmful targets needed to fix that defect. The
    relation-specific evaluator and aggregate publication gate added for
    [texteater#191](https://github.com/clockblocker/texteater/issues/191) now make
    those failures part of `contractPass`.

## Semantic evaluation report

The reusable report format is `german-relation-evaluation-v1`. It publishes a
separate gate for every requested direct relation kind. Each gate reports target
precision and false-positive rate, harmful-target false-positive rate,
required-target recall and omission count, null accuracy, target Family/Kind
accuracy, relation-kind confusions, unclassified false positives, and
run-to-run stability. The top-level result fails when any requested relation
gate fails; metrics cannot be averaged across relation kinds to conceal a weak
one.

The publication thresholds are deliberately precision-first: precision,
recall, null accuracy, Family/Kind accuracy, and stability must each be `1`;
ordinary and harmful false-positive rates must each be `0`; no kind confusion
or unclassified miss is allowed. Stability requires at least three runs. Exact
JSON equality is retained only as a diagnostic, so a bounded acceptable target
set may pass the semantic contract without matching the retained ideal byte for
byte.

The historical four shape-correct examples now score `0/4` on semantic
`contractPass`: request mirroring and valid target shapes alone cannot satisfy
the relation gate.

## Remaining gate

The disclosed corpus and sealed acceptance reservation are implementation-complete.
The untouched acceptance selection cannot be revealed or run until a human
approves consuming its reservation.
Final semantic authority remains the human gate in
[texteater#193](https://github.com/clockblocker/texteater/issues/193).
