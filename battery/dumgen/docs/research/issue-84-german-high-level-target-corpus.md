# German High-Level Target Classification corpus boundaries

Issue [#84](https://github.com/clockblocker/texteater/issues/84) freezes a
representation-neutral German semantic oracle. It deliberately records complete
Segment arrays and ordered original `memberSegmentIndices`; experiments must
adapt their private DTOs to that contract rather than rewrite the oracle. The
142 cases comprise twenty explicitly selected demonstrations, 94 explicitly
selected development cases, and 28 role-neutral support or member-click
coverage cases. The click-first v6 remediation added analogous teaching
stimuli without changing those 94 cases. The v7 policy revision then changed
nine development ideals from multi-member Collocations to separate Lexemes;
v7 is therefore not a representation-only comparison with earlier runs.
Because retained misses informed both revisions, the 94 cases are no longer an
untouched holdout. A fresh analogous holdout must be frozen before any claim of
generalization. No provider was called by the v7 change.

Collection membership is role-neutral: `routes`, `boundaries`, and `robustness`
describe what each case exercises, while only `selections.ts` assigns
demonstration or evaluation roles.

Every sentence variant containing the spellings *eine Entscheidung
treffen* or *aufstehen* shares an explicit contamination key,
including nearby-nonmember clicks and noisy spellings. The v6 Demonstration
Selection uses distinct analogous stimuli and teaches contrasts by changing the
click within one stimulus: fixed-member clicks converge on one target, while a
free modifier, argument, filler, or repeated neighbor remains standalone.
Every published role continues to be assigned by an explicit case ID, and the
shared contamination validator keeps exact stimuli and declared lexical units
from crossing the demonstration/development boundary.

Every fixedness or grammatical-boundary Golden Case carries a concise,
source-auditable explanation. Where IDS classifies the exact expression, the
case says so. Where IDS establishes only a linguistic category, the case
separately names issue #82 as the product-policy source of the exact Dumgen
Family/Kind and original-index membership rather than implying that IDS chose
the oracle.

## Linguistic evidence

- The Leibniz Institute for the German Language (IDS) defines a phraseolexeme
  as an established multiword expression denoting one concept, distinguishes
  direct from idiomatic meaning, and notes that its realization may vary with
  context. That supports occurrence-sensitive fixed/free and literal/idiomatic
  pairs rather than grouping by spelling alone. [IDS grammis:
  Phraseolexem](https://grammis.ids-mannheim.de/terminologie/1175)
- Exact-expression support is recorded where available. An IDS idiom study
  explicitly contrasts literal and figurative readings of *das Eis brechen*;
  an IDS proverb study identifies *Morgenstund hat Gold im Mund* as a proverb;
  and IDS describes `je … desto/umso` as an obligatory two-part proportional
  correlation. These sources establish the expression-level linguistic facts,
  while issue #82 still owns Dumgen's Family/Kind projection and exact member
  indices. [IDS: idiom study](https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/7790/file/Harras_Idiome_1997.pdf),
  [IDS: proverb study](https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/13187/file/Hein_Zugang_zur_Sprichwortbedeutung_2012.pdf),
  [IDS grammis: Proportionalsätze](https://grammis.ids-mannheim.de/systematische-grammatik/2118)
- An IDS publication records *mit den Wölfen heulen* as a conventional
  paremiological expression. That supports fixed-expression status but does
  not mechanically choose this corpus's inflected occurrence route. Issue #82
  classifies it as `Phraseme/Idiom`, includes the realized fixed function
  words, and excludes the freely inserted adjective. [IDS publication:
  paremiological expressions](https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/13241/file/Matulina_Die_Verwendung_von_Sprichwoertern_2012.pdf)
- IDS's generic phraseolexeme definition does not itself classify *Wissen ist
  Macht*, *Herzlichen Dank*, or *Guten Morgen* into Dumgen's route taxonomy.
  Their `Aphorism` or `DiscourseFormula` route and exact fixed membership are
  explicit issue #82 corpus policy. The per-case explanations preserve that
  distinction instead of presenting a category-level source as an
  expression-level authority.
- The IDS verb-valency dictionary records *spazieren gehen* as one entry and
  gives the separated finite form *geht spazieren*. Issue #82, not that
  dictionary entry, fixes Dumgen's `Lexeme/VERB` route and original member
  indices `[2, 6]` for the corpus occurrence. [IDS grammis: spazieren
  gehen](https://grammis.ids-mannheim.de/verbvalenz/400901)
- IDS explicitly records `zu + dem` as `zum`, while its grammar lists *eine
  Frage stellen* as a meaning unit. Those expression facts support the Fusion
  and overlap controls; the revised high-level product policy deliberately
  keeps each non-idiomatic support-verb member as its own Lexeme despite the
  conventional meaning unit. [IDS grammis:
  zu](https://grammis.ids-mannheim.de/praepositionen/299700), [IDS grammis:
  Nominalisierungsverb und
  Funktionsverb](https://grammis.ids-mannheim.de/systematische-grammatik/514)
- IDS defines a Funktionsverbgefüge as a verb plus nominal or prepositional
  group functioning as one predicate, gives examples such as *zum Ende kommen*
  and *Zustimmung erteilen*, and explicitly says the boundary with a full verb
  plus object is gradual. The high-level corpus treats this gradual,
  non-idiomatic conventionality as insufficient for fixed multi-segment
  membership: each clicked verb, determiner, preposition or noun receives its
  own route unless another independently fixed rule applies. [IDS grammis:
  Funktionsverbgefüge](https://grammis.ids-mannheim.de/vggf/2202)
- IDS distinguishes a verb-governed prepositional object—whose preposition is
  not freely exchangeable—from an adverbial PP, whose relation and preposition
  are selected more freely. That licenses the *wartet auf* / *läuft auf der
  Wiese* contrast. Grouping only the governed preposition with the verb, while
  leaving its nominal argument separate, is the settled Dumgen target policy,
  not a claim that IDS treats those two words as a lexeme. [IDS grammis:
  Präpositionalgruppe](https://grammis.ids-mannheim.de/sgt/2262)
- For obligatorily reflexive verbs, IDS says the reflexive pronoun is lexically
  required and part of the lexeme; without it the expression is uninterpretable
  or changes meaning. This supports grouping *schämt sich* while the ordinary
  anaphoric object in *wäscht sich* remains a separate pronoun. [IDS grammis:
  Reflexiv-Pronomen](https://grammis.ids-mannheim.de/progr%40mm/5205)
- IDS analyzes *aufstehen* as a verb whose stressed prefix separates in finite
  clauses and contrasts it with unseparated *verstehen*. This supports
  discontinuous membership independent of canonical order. [IDS grammis:
  Verben mit Vorsilben](https://grammis.ids-mannheim.de/progr%40mm/6922)
- IDS treats `haben`, `sein`, and `werden` plus an infinite full-verb form as
  verbal periphrases realizing perfect, future, and passive forms of that full
  verb. That supports one high-level target across all realized auxiliary and
  lexical-verb components, including long-distance and stacked contexts. [IDS
  grammis: Hilfsverben im
  Verbalkomplex](https://grammis.ids-mannheim.de/progr%40mm/1695)
- Modal verbs, by contrast, contribute modal meaning, while copulas combine
  with a predicative complement to form the predicate. The corpus follows the
  product decision to keep each meaning-bearing modal or copula separate from
  its governed verb or predicate; this is a learner-facing target-level choice,
  not the assertion that German syntax contains no larger verb complex or
  predicate. [IDS grammis:
  Modalverb](https://grammis.ids-mannheim.de/terminologie/155), [IDS grammis:
  Kopulaverb](https://grammis.ids-mannheim.de/terminologie/146)

## Frozen disputes and evaluator scope

Borderline conventionality is intentionally asymmetric: a defensible
standalone classification wins over speculative grouping, while `Unresolved`
is reserved for material with no defensible route. Fixed function words are
members; freely inserted modifiers and ordinary arguments are not. These are
product policies grounded by, but not mechanically entailed by, the linguistic
sources above.

The two `Unresolved` explanations cite IDS only for the observable German
word-class inventory; they do not claim that the opaque strings are
classifiable. Issue #82 supplies the decision rule: when no Family/Kind is
defensible for the clicked `ResolvableText`, the oracle returns `Unresolved`
without guessed membership.

The corpus covers every currently reachable German high-level route. It does
not fabricate a `ResolvableText` punctuation click for `Lexeme/PUNCT`: Dumgen's
Source Segmentation contract makes `Punctuation` non-clickable while target
membership admits only `ResolvableText`. The retained `Lexeme/PUNCT` inventory
entry in downstream Grammatical Resolution is therefore an explicit
clickability/domain gap, not a reachable high-level route.

Because issue #84 forbids choosing among private membership representations,
the Canonical Classification Corpus remains in the Laboratory route tree rather
than being attached to today's private Prompt Source. It owns both canonical
input and output schemas; no canonical module imports a candidate Prompt Source
schema. Prompt Assembly owns the
`PromptRepresentationAdapter` seam: issue #85's representation-specific
Adapters must materialize the one frozen Demonstration Selection and
canonicalize private outputs before this evaluator sees them. No second case
registry or parallel Prompt Source is permitted.

The pure evaluator first joins each `{ caseId, output }` observation to the
authoritative canonical input and ideal output in the expected Case Selection;
observations cannot replace either oracle value. It then parses the canonical
semantic result and reports decision, route, exact membership, false grouping,
false splitting, non-`ResolvableText` membership, order, uniqueness, click
inclusion, and correct `Unresolved` independently. A second pure aggregate
groups cases with the shared semantic-target fingerprint, requires an
observation for every expected member click, and checks that all of those
outputs are identical.
Deterministic corpus construction separately
rejects empty, non-integer, out-of-bounds, unordered, duplicate,
non-`ResolvableText`, or click-excluding oracle membership.
