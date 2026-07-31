# Click Resolution corpus and evaluation contract

Status: fixed research artifact for
[`clockblocker/texteater#5`](https://github.com/clockblocker/texteater/issues/5).
It defines experiment inputs and gold outputs; it does **not** choose a
production prompt, model, decomposition, or adapter.

## Sources and authority

The normative domain contract is the Click Resolution ticket
[#5](https://github.com/clockblocker/texteater/issues/5), its parent map
[#2](https://github.com/clockblocker/texteater/issues/2), and the dumgen
[context glossary](../../CONTEXT.md). In particular, Selection identity is the
sentence/click pair, membership is ordered ResolvableText indices including the
click, `attestedSurface` is application-constructed, and normalization may not
insert, reorder, or lemmatize unattested lexical material.

The checked-in dumling source is authoritative for the vocabulary available at
the time of this artifact: languages `de`, `en`, and `he`; the families
`Phraseme`, `Lexeme`, `Morpheme`, and `Construction`; and Surface kinds
`Citation` and `Inflection`
([enums](../../../dumling/src/types/core/enums.ts)). Its German and English
feature types define the applicable feature names and value inventories
([German verb](../../../dumling/src/types/concrete-language/features/de/lexeme/verb.ts),
[German adjective](../../../dumling/src/types/concrete-language/features/de/lexeme/adjective.ts),
[German noun](../../../dumling/src/types/concrete-language/features/de/lexeme/noun.ts),
[German adposition](../../../dumling/src/types/concrete-language/features/de/lexeme/adposition.ts),
[English verb](../../../dumling/src/types/concrete-language/features/en/lexeme/verb.ts),
[English noun](../../../dumling/src/types/concrete-language/features/en/lexeme/noun.ts)).
The Dumling schema now uses this contract's Selection, Surface, and Linguistic
Entry topology
([current entities](../../../dumling/src/types/abstract/entities.ts)).

The Lexeme/Lemma/Sense topology is resolved by
[#11](https://github.com/clockblocker/texteater/issues/11) and the
[identity ADR](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md):
opaque Linguistic Entry identity is distinct from citation-form text and
learner Meaning. Valency and non-member governed associations remain out of
scope in
[#12](https://github.com/clockblocker/texteater/issues/12).

## Record conventions

All inputs below are immutable, hand-authored `SegmentedSentence` records. IDs
are corpus-stable opaque strings. Segment notation is `index:Kind:"text"`,
where `R = ResolvableText`, `W = Whitespace`, and `P = Punctuation`. Every
listed array is complete; concatenating every Segment's text reproduces the
sentence exactly.

The gold record shapes are:

```ts
type GoldSelection = {
  segmentedSentenceId: string;
  clickedSegmentIndex: number;
  surfaceSegmentIndices: readonly number[];
  attestedSurface: string; // evaluator-produced, never accepted from the model
  selectedOrthography: "Standard" | "Typo";
};

type GoldSurface = {
  language: "de" | "en";
  normalizedSurface: string;
  spelling: "Canonical" | "Variant";
  realizationCoverage: "Full" | "Partial";
  surfaceKind: "Citation" | "Inflection";
  inflectionalFeatures: Readonly<Record<string, string | null>>;
  entryKey: string; // corpus-scoped opaque Linguistic Entry ID
};

type GoldMeaning =
  | { decision: "ReuseExisting"; existingMeaningId: string }
  | {
      decision: "DraftNew";
      draft: {
        meaningInEmojis: string;
        descriptionBlocks: readonly string[];
      };
    };
```

Feature objects use a canonical sparse representation: fields with a non-null
gold value are listed, applicable `null` fields are omitted, and inapplicable
or unknown fields are forbidden. Before exact comparison, the evaluator removes
applicable fields whose value is explicitly `null`; it performs no other
coercion. This keeps the tables readable while remaining equivalent to
dumling's nullable applicable feature bags.

## Immutable Segmented Sentence corpus

| ID | Language | Complete indexed Segments |
|---|---|---|
| `CR-01` | de | `0:R:"Mutter"`, `1:P:"."` |
| `CR-02` | en | `0:R:"Mark"`, `1:W:" "`, `2:R:"gvae"`, `3:W:" "`, `4:R:"up"`, `5:W:" "`, `6:R:"on"`, `7:W:" "`, `8:R:"it"`, `9:P:"."` |
| `CR-03` | en | `0:R:"u"`, `1:W:" "`, `2:R:"r"`, `3:W:" "`, `4:R:"him"` |
| `CR-04` | de | `0:R:"Er"`, `1:W:" "`, `2:R:"heulte"`, `3:W:" "`, `4:R:"mit"`, `5:P:"."` |
| `CR-05` | de | `0:R:"Pass"`, `1:W:" "`, `2:R:"auf"`, `3:W:" "`, `4:R:"dich"`, `5:W:" "`, `6:R:"auf"`, `7:P:"!"` |
| `CR-06` | de | `0:R:"Nur"`, `1:W:" "`, `2:R:"Bahnhof"`, `3:P:"!"` |
| `CR-07` | de | `0:R:"Sie"`, `1:W:" "`, `2:R:"las"`, `3:W:" "`, `4:R:"das"`, `5:W:" "`, `6:R:"rote"`, `7:W:" "`, `8:R:"Buch"`, `9:P:"."` |
| `CR-08` | de | `0:R:"Er"`, `1:W:" "`, `2:R:"hat"`, `3:W:" "`, `4:R:"das"`, `5:W:" "`, `6:R:"Buch"`, `7:W:" "`, `8:R:"ge"`, `9:R:"öffne"`, `10:R:"t"`, `11:P:"."` |
| `CR-09` | en | `0:R:"The"`, `1:W:" "`, `2:R:"armor"`, `3:W:" "`, `4:R:"gleamed"`, `5:P:"."` |
| `CR-10` | en | `0:R:"The"`, `1:W:" "`, `2:R:"armour"`, `3:W:" "`, `4:R:"gleamed"`, `5:P:"."` |
| `CR-11` | en | `0:R:"The"`, `1:W:" "`, `2:R:"book"`, `3:W:" "`, `4:R:"fell"`, `5:P:"."` |
| `CR-12` | en | `0:R:"They"`, `1:W:" "`, `2:R:"book"`, `3:W:" "`, `4:R:"rooms"`, `5:P:"."` |
| `CR-13` | de | `0:R:"Ich"`, `1:W:" "`, `2:R:"spielte"`, `3:P:"."` |
| `CR-14` | de | `0:R:"Er"`, `1:W:" "`, `2:R:"spielte"`, `3:P:"."` |
| `CR-15` | de | `0:R:"Das"`, `1:W:" "`, `2:R:"Schloss"`, `3:W:" "`, `4:R:"an"`, `5:W:" "`, `6:R:"der"`, `7:W:" "`, `8:R:"Tür"`, `9:W:" "`, `10:R:"klemmt"`, `11:P:"."` |
| `CR-16` | de | `0:R:"Der"`, `1:W:" "`, `2:R:"Motor"`, `3:W:" "`, `4:R:"läuft"`, `5:P:"."` |
| `CR-17` | de | `0:R:"Die"`, `1:W:" "`, `2:R:"Uhr"`, `3:W:" "`, `4:R:"läuft"`, `5:P:"."` |

## Exact per-click Selection, Surface, and Meaning gold

In `features`, `{}` means no inflectional features apply. A `meaning` value
`reuse:X` expands exactly to
`{decision:"ReuseExisting", existingMeaningId:"X"}`. `new:LOCK` expands to the
new-Meaning draft defined after the table.

| Case | Click | Membership | `attestedSurface` | Orth. | `normalizedSurface` | Spell. | Cov. | Kind and features | Entry | Meaning |
|---|---:|---|---|---|---|---|---|---|---|---|
| `CR-01` | 0 | `[0]` | `Mutter` | Standard | `Mutter` | Canonical | Full | Citation `{}` | `L-DE-MUTTER` | `reuse:M-DE-MOTHER` |
| `CR-02` | 2 | `[2,4]` | `gvae up` | Typo | `gave up` | Canonical | Full | Inflection `{"mood":"Ind","number":"Sing","person":"3","tense":"Past","verbForm":"Fin"}` | `L-EN-GIVE-UP` | `reuse:M-EN-SURRENDER` |
| `CR-02` | 4 | `[2,4]` | `gvae up` | Standard | `gave up` | Canonical | Full | same as preceding row | `L-EN-GIVE-UP` | `reuse:M-EN-SURRENDER` |
| `CR-03` | 0 | `[0,2,4]` | `u r him` | Typo | `you are him` | Canonical | Full | Citation `{}` | `ENTRY-TAXONOMY-UNRESOLVED` | `reuse:M-EN-IDENTITY-ASSERTION` |
| `CR-03` | 2 | `[0,2,4]` | `u r him` | Typo | `you are him` | Canonical | Full | Citation `{}` | `ENTRY-TAXONOMY-UNRESOLVED` | `reuse:M-EN-IDENTITY-ASSERTION` |
| `CR-03` | 4 | `[0,2,4]` | `u r him` | Standard | `you are him` | Canonical | Full | Citation `{}` | `ENTRY-TAXONOMY-UNRESOLVED` | `reuse:M-EN-IDENTITY-ASSERTION` |
| `CR-04` | 2 | `[2,4]` | `heulte mit` | Standard | `heulte mit` | Canonical | Partial | Inflection `{"mood":"Ind","number":"Sing","person":"3","tense":"Past","verbForm":"Fin"}` | `L-DE-WOLF-IDiom` | `reuse:M-DE-JOIN-IN` |
| `CR-04` | 4 | `[2,4]` | `heulte mit` | Standard | `heulte mit` | Canonical | Partial | same as preceding row | `L-DE-WOLF-IDiom` | `reuse:M-DE-JOIN-IN` |
| `CR-05` | 0 | `[0,6]` | `Pass auf` | Standard | `pass auf` | Canonical | Full | Inflection `{"mood":"Imp","number":"Sing","person":"2","verbForm":"Fin"}` | `L-DE-AUFPASSEN` | `reuse:M-DE-BE-CAREFUL` |
| `CR-05` | 2 | `[2]` | `auf` | Standard | `auf` | Canonical | Full | Citation `{}` | `L-DE-AUF-ADP` | `reuse:M-DE-ON-RELATION` |
| `CR-05` | 6 | `[0,6]` | `Pass auf` | Standard | `pass auf` | Canonical | Full | Inflection `{"mood":"Imp","number":"Sing","person":"2","verbForm":"Fin"}` | `L-DE-AUFPASSEN` | `reuse:M-DE-BE-CAREFUL` |
| `CR-06` | 2 | `[0,2]` | `Nur Bahnhof` | Standard | `nur Bahnhof` | Canonical | Partial | Citation `{}` | `L-DE-BAHNHOF-IDiom` | `reuse:M-DE-NOT-UNDERSTAND` |
| `CR-07` | 6 | `[6]` | `rote` | Standard | `rote` | Canonical | Full | Inflection `{"case":"Acc","degree":"Pos","gender":"Neut","number":"Sing"}` | `L-DE-ROT` | `reuse:M-DE-RED` |
| `CR-08` | 8 | `[8,10]` | `get` | Standard | `get` | Canonical | Full | Citation `{}` | `L-DE-GE-T` | `reuse:M-DE-PARTICIPLE-MARKER` |
| `CR-08` | 10 | `[8,10]` | `get` | Standard | `get` | Canonical | Full | Citation `{}` | `L-DE-GE-T` | `reuse:M-DE-PARTICIPLE-MARKER` |
| `CR-09` | 2 | `[2]` | `armor` | Standard | `armor` | Canonical | Full | Citation `{}` | `L-EN-ARMOR` | `reuse:M-EN-ARMOR` |
| `CR-10` | 2 | `[2]` | `armour` | Standard | `armour` | Variant | Full | Citation `{}` | `L-EN-ARMOR` | `reuse:M-EN-ARMOR` |
| `CR-11` | 2 | `[2]` | `book` | Standard | `book` | Canonical | Full | Citation `{}` | `L-EN-BOOK-N` | `reuse:M-EN-BOOK-OBJECT` |
| `CR-12` | 2 | `[2]` | `book` | Standard | `book` | Canonical | Full | Inflection `{"mood":"Ind","number":"Plur","person":"3","tense":"Pres","verbForm":"Fin"}` | `L-EN-BOOK-V` | `reuse:M-EN-RESERVE` |
| `CR-13` | 2 | `[2]` | `spielte` | Standard | `spielte` | Canonical | Full | Inflection `{"mood":"Ind","number":"Sing","person":"1","tense":"Past","verbForm":"Fin"}` | `L-DE-SPIELEN` | `reuse:M-DE-PLAY` |
| `CR-14` | 2 | `[2]` | `spielte` | Standard | `spielte` | Canonical | Full | Inflection `{"mood":"Ind","number":"Sing","person":"3","tense":"Past","verbForm":"Fin"}` | `L-DE-SPIELEN` | `reuse:M-DE-PLAY` |
| `CR-15` | 2 | `[2]` | `Schloss` | Standard | `Schloss` | Canonical | Full | Citation `{}` | `L-DE-SCHLOSS` | `new:LOCK` |
| `CR-16` | 4 | `[4]` | `läuft` | Standard | `läuft` | Canonical | Full | Inflection `{"mood":"Ind","number":"Sing","person":"3","tense":"Pres","verbForm":"Fin"}` | `L-DE-LAUFEN-FUNCTION` | `reuse:M-DE-FUNCTION` |
| `CR-17` | 4 | `[4]` | `läuft` | Standard | `läuft` | Canonical | Full | same as preceding row | `L-DE-LAUFEN-FUNCTION` | `reuse:M-DE-FUNCTION` |

`new:LOCK` is exactly:

```json
{
  "decision": "DraftNew",
  "draft": {
    "meaningInEmojis": "🔒",
    "descriptionBlocks": ["a device that fastens a door or other closure"]
  }
}
```

For `CR-15`, the supplied learner inventory contains only
`M-DE-CASTLE = {meaningInEmojis:"🏰", descriptionBlocks:["a large fortified or
palatial building"]}` for the relevant candidate identity; therefore reuse is
wrong. For `CR-16` the inventory already contains
`M-DE-FUNCTION = {meaningInEmojis:"⚙️", descriptionBlocks:["to operate or
function"]}`. `CR-17` must reuse it: the clock and motor contexts are the
deliberate “do not split semantic pennies” pair. These learner-local boundaries
follow the map and glossary rather than asserting a universal dictionary sense
boundary ([map](https://github.com/clockblocker/texteater/issues/2),
[Meaning glossary](../../CONTEXT.md)).

## Linguistic Entry gold after #11

These are the exact Entry experiment columns required by #5. Each populated
Entry key is a corpus-scoped opaque identity, not a tuple derived from its
descriptive fields. Meaning candidate inventories are keyed by that resolved
identity. Matching citation form and grammar retrieves candidates but does not
establish identity.

Absent applicable inherent features mean `null`; `{}` means none apply.

| Entry key | Citation Form | Family | Subkind | Inherent features |
|---|---|---|---|---|
| `L-DE-MUTTER` | `Mutter` | Lexeme | NOUN | `{"gender":"Fem"}` |
| `L-EN-GIVE-UP` | `give up` | Lexeme | VERB | `{"phrasal":"Yes"}` |
| `ENTRY-TAXONOMY-UNRESOLVED` | `you are him` | **UNRESOLVED (not a #11 identity question)** | **UNRESOLVED** | `{}` |
| `L-DE-WOLF-IDiom` | `mit den Wölfen heulen` | Phraseme | Idiom | `{}` |
| `L-DE-AUFPASSEN` | `aufpassen` | Lexeme | VERB | `{"hasSepPrefix":"auf"}` |
| `L-DE-AUF-ADP` | `auf` | Lexeme | ADP | `{"adpType":"Prep"}` |
| `L-DE-BAHNHOF-IDiom` | `nur Bahnhof verstehen` | Phraseme | Idiom | `{}` |
| `L-DE-ROT` | `rot` | Lexeme | ADJ | `{}` |
| `L-DE-GE-T` | `ge-…-t` | Morpheme | Circumfix | `{}` |
| `L-EN-ARMOR` | `armor` | Lexeme | NOUN | `{}` |
| `L-EN-BOOK-N` | `book` | Lexeme | NOUN | `{}` |
| `L-EN-BOOK-V` | `book` | Lexeme | VERB | `{}` |
| `L-DE-SPIELEN` | `spielen` | Lexeme | VERB | `{}` |
| `L-DE-SCHLOSS` | `Schloss` | Lexeme | NOUN | `{"gender":"Neut"}` |
| `L-DE-LAUFEN-FUNCTION` | `laufen` | Lexeme | VERB | `{}` |

`u r him` is intentionally not called a Phraseme. Issue #5 requires all three
clicks to resolve the same multi-Segment Surface, but the current source offers
no clearly applicable non-Phraseme family/subkind for this compositional clause:
`Construction/PairedFrame` exists, but assigning it here would invent a
taxonomy rule not present in the source. Membership and normalization are
therefore fixed and scoreable; its Entry and Meaning fields remain excluded
from scoring until that independent taxonomy gap is resolved. #11 decides how
an Entry is identified once its family is known; it does not invent a family
for arbitrary compositional clauses. This also keeps `CR-07` as the explicit
control showing that an ordinary compositional phrase must resolve only the
clicked lexical Surface, not be inflated into a Phraseme.

The `CR-04` Inflection of a Phraseme is required by the domain contract. It must
remain representable without inserting `den Wölfen` or changing the gold
Linguistic Entry: `heulte mit` is a partial contextual realization of the
Phraseme whose citation form is `mit den Wölfen heulen`.

## Deterministic application construction of `attestedSurface`

Models are never asked for, nor credited for, `attestedSurface`. After canonical
membership validation, application code constructs it:

1. Read member Segment texts in ascending index order without changing code
   points or case.
2. Between two consecutive members, emit no separator when the original
   intervening slice contains no `Whitespace`; otherwise emit one ASCII space.
3. Do not emit any intervening non-member `ResolvableText`, `OpaqueText`, or
   `Punctuation`.

Thus `[2,4]` in `CR-02` is `gvae up`; `[0,6]` in `CR-05` is `Pass auf` without
the governed `auf` or `dich`; and `[8,10]` in `CR-08` is `get`, not `ge t` and
not `geöffnet`. The member strings themselves are verbatim. This corpus fixes
only the whitespace behavior it exercises; preserving richer whitespace can be
added in a separately versioned corpus rather than changing these gold values.

Normalization is exact Unicode string equality after NFC normalization only.
It may repair the clicked or non-clicked typo (`gvae up` → `gave up`) and
ordinary case, and it may preserve a licensed variant (`armour`). It may not
insert, delete, or reorder lexical constituents: in particular `heulte mit`
must not become `mit den Wölfen heulen`, `heulte mit den Wölfen`, or any other
form containing absent material. The complete citation form belongs only in
the Linguistic Entry, as required by the map and glossary
([#2](https://github.com/clockblocker/texteater/issues/2),
[Surface glossary](../../CONTEXT.md)).

## Scoring contract

### Validation and invalid output

Each model attempt is parsed once against that experiment's declared response
schema. Timeout, provider error, refusal, truncation, malformed JSON, extra
unknown fields, wrong scalar types, duplicate indices, non-ascending indices,
an out-of-range index, any non-`ResolvableText` member, or membership omitting
the click is an **invalid attempt**. It receives zero for every correctness
metric for that click; latency, output size, token use, and cost are still
recorded. No repair, retry, majority vote, fuzzy parsing, or silent index
sorting is allowed in the primary score. A separately named adapter experiment
may transform another representation to canonical indices, but its failures
remain failures of that experiment.

### Per-click metrics

All categorical and string fields use exact match (strings after NFC only).

- `membership_exact`: predicted ordered index array equals gold.
- `membership_precision`, `membership_recall`, `membership_F1`: set-based
  diagnostics; exact remains the acceptance metric.
- `attestedSurface_exact`: application-produced value equals gold. A model
  field of that name is ignored and is itself invalid when unknown fields are
  forbidden.
- `selectedOrthography_exact`.
- `normalizedSurface_exact`; also report `unattested_insertion_violation` and
  `lemmatization_violation` by comparing predicted lexical material with the
  attested membership and gold.
- `spelling_exact`, `realizationCoverage_exact`, and `surfaceKind_exact`.
- `inflectionalFeatures_exact`: exact canonical sparse object, with separate
  micro-accuracy per applicable feature.
- `citationForm_exact`, `family_exact`, `subkind_exact`,
  `inherentFeatures_exact`, and opaque Entry identity exact. The unresolved
  `CR-03` taxonomy row is excluded from these metrics.
- `meaning_decision_exact`; for reuse, existing ID exact; for
  new, emoji and ordered description blocks exact. A secondary human/blinded
  semantic rubric may be reported for alternative wording, but cannot replace
  this fixed reproducibility score. `CR-03` is excluded until its Entry family
  is defined.

### Cross-case relational assertions

These are scored as binary assertions over the whole run:

- the two `CR-02` clicks have identical membership, Surface, Entry key, and
  Meaning, but different clicked orthography;
- all three `CR-03` clicks have identical membership and Surface, with `u` and
  `r` Typo and `him` Standard;
- `CR-04.normalizedSurface == "heulte mit"` and coverage is Partial;
- `CR-05` clicks 0 and 6 share `[0,6]`, while governed click 2 resolves only
  `[2]`; no valency relation is inferred or scored;
- `CR-06` is Partial Phraseme while `CR-07` is a one-member Lexeme, preventing
  phraseme inflation;
- both `CR-08` clicks share `[8,10]` and application output `get`;
- `CR-09` and `CR-10` share the same Entry reference and Meaning but are
  distinct Surfaces because normalized spelling and `spelling` differ;
- `CR-11` and `CR-12` both normalize to `book` but have distinct global Surface
  identities because grammatical analysis and Lexeme identity differ;
- `CR-13` and `CR-14` share spelling and Linguistic Entry but are distinct Surfaces
  because `spielte` is first-person singular in one context and third-person
  singular in the other;
- `CR-16` and `CR-17` reuse the same Meaning.

### Runtime, output, and cost

For every attempt record model/provider/version, experiment build hash,
temperature and seed when available, start/end timestamps, wall-clock
milliseconds, provider-reported input/output/cached/reasoning tokens, raw UTF-8
output bytes, parsed JSON bytes, retry count (primary contract: zero), and cost
in the provider's billing currency computed from a snapshotted price table.
Report p50, p95, maximum, mean, and total for latency; mean, p95, and total for
bytes and each token class; and mean and total cost. Missing provider token or
price data is `unavailable`, never zero. Correctness comparison must use the
same corpus, split, concurrency policy, repetition count, and price snapshot.

### Aggregation and acceptance gates

Use click cases—not sentences—as the primary unit. Report micro averages across
all 24 clicks, macro averages by required-case group, and every individual
case. Do not average away relational assertions or invalid attempts.

A candidate experiment is eligible to advance only if:

1. invalid-attempt rate is 0%;
2. membership, application `attestedSurface`, normalized Surface, clicked
   orthography, spelling, coverage, Surface kind, and applicable inflectional
   feature exact accuracy are each 100%;
3. every normalization violation count is zero;
4. every cross-case relational assertion passes;
5. every populated Linguistic Entry field and identity is 100%;
6. Meaning decision and reuse-ID accuracy are 100% for every row with a
   resolved Entry, and the fixed new draft matches exactly;
7. latency, output, and cost statistics are complete (no numeric threshold is
   invented by this research ticket).

The `CR-03` Entry and Meaning fields are excluded from aggregate correctness
denominators until its independent family taxonomy gap is resolved. No prompt
can be selected for production solely by passing this artifact.

## Requirement coverage matrix

| #5 requirement | Corpus/gate |
|---|---|
| simple one-Segment lexical occurrence | `CR-01` |
| `gvae ... up`, both clicks | `CR-02` |
| `u`, `r`, `him`, same multi-Segment Surface | `CR-03` and explicit Entry-family taxonomy note |
| partial `heulte ... mit`, no insertion | `CR-04`, normalization gate |
| `Pass`, governed `auf`, detached `auf`; click in membership; no valency | `CR-05`, relational gate, #12 exclusion |
| partial fixed phraseme | `CR-06` |
| non-fixed phrase not inflated | `CR-07` |
| discontinuous `ge-...-t` | `CR-08`, deterministic construction |
| Citation and Inflection | `CR-01`; `CR-02` and others |
| canonical and Variant `armor`/`armour` | `CR-09`, `CR-10` |
| identical noun/verb spelling, distinct identity | `CR-11`, `CR-12` |
| overlapping inflections, distinct analyses | `CR-13`, `CR-14` |
| existing Meaning reuse and new creation | `CR-16`; `CR-15` |
| close semantic case remains one Meaning | `CR-16`, `CR-17` |
| latency, output size, model cost | runtime section |
| no production prompt choice | status and final acceptance paragraph |
