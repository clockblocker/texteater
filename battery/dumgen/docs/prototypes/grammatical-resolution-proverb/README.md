# German Phraseme/Proverb Grammatical Resolution evaluation

This route-local prototype covers exactly
`grammatical-resolution/de/phraseme/proverb`. It adds no catalog or runtime
dispatch wiring. The Golden Corpus has 26 cases:
four necessary demonstrations, 20 explicitly pinned held-out cases, and two
corpus-only wording-variant boundaries. Demonstration and evaluation selections
are disjoint by case, normalized input, and explicit lemma contamination keys.

The four demonstrations teach distinct policies: quoted reporting context is
outside whole-unit membership; a one-member spelling error is repaired and
marked `Typo`; internal punctuation is excluded from the normalized Surface;
and an explicitly editorially classified authored Aphorism contradicts the
fixed Proverb route. The held-out suite contains 13 source-verified Proverbs and
seven boundaries: Aphorism, Idiom, DiscourseFormula, arbitrary direct speech,
incomplete target scope, overbroad attribution, and members spanning two
independent proverbs.

The model DTOs are projected from Dumling's German Phraseme/Proverb Lemma and
Citation Surface schemas. Fixed route fields (`language`, `family`, `kind`) and
the Surface's linked Lemma are absent from model exchange. The complete Core
Feature object is `{}`. Proverb exposes no Dumling Inflection Surface, so
`surfaceKind` is always `Citation` and `inflectionalFeatures` is never emitted.
The route tests both directions of the fixed-fields codecs: model DTOs decode to
canonical Dumling entities with every fixed field restored, and encoding those
entities removes exactly the fixed fields again.

Whole-unit membership follows the Selection contract rather than treating a
sentence as one opaque string. The input schema reuses the shared TARGET
preflight and additionally requires at least two pairs. Each pair therefore
identifies exactly one word-like lexical member before a model call.
`memberOrthographies` maps one-to-one to validated members in textual order.
The normalized Surface is their space-separated projection, so it excludes
commas, quotation marks, and terminal punctuation. Only a complete, single
Proverb can resolve; partial, overbroad, or two-unit scope is `Unresolved`
rather than `Partial`.

The prompt treats the upstream route as authoritative. It asks only whether
the marked context provides positive evidence of a route or scope
contradiction; lack of recognition or independent attestation is not evidence
for `Unresolved`. A named speaker may quote a proverb without changing its
route. Aphorism contradiction therefore requires observable editorial evidence
such as explicit identification as an entry in an aphorism collection.

The pure evaluator reports exact diagnostics for decision/coherence,
mechanical TARGET-member count and orthographies, every Citation Surface field,
Canonical Form, and the empty Core Feature object. It canonicalizes only an
all-null `surfaceFeatures` bag to `null`, matching the route-local codec.

The bounded runner makes one serial `gpt-5.6-luna` call per held-out case with
no reasoning, no retries, `store: false`, and a 16,384-token route-local
response budget. Import and preflight make no provider call. Draft evidence is
written atomically and cannot meet the evidence threshold until offline
finalization. The retained schema binds the exact prompt, schemas, ordered case
IDs, model policy, attempts, and recomputed summary. Provider metadata and raw
output are retained even when parsing fails. Offline finalization reparses each
successful attempt's `rawOutputText` with the current output schema and rejects
it unless it exactly equals the retained parsed output before rescoring.

A deliberate live run can be started from `battery/dumgen` through the package
command or by invoking the runner directly with an explicit environment file.
Finalization is offline:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-proverb/run.ts

bun run docs/prototypes/grammatical-resolution-proverb/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-proverb/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-proverb/runs/<timestamp>/miss-classifications.json
```

Each scored miss must be classified as `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, with a non-empty
explanation. Final evidence additionally requires at least 15 attempted cases,
an 80% score, and zero execution/provider errors.

## Retained evidence

The finalized run at `runs/2026-08-03T14-47-28-312Z/results.json` scored 19/20
(95%) with zero provider errors and zero unclassified misses. Its only miss,
`grammar-de-proverb-unresolved-idiom`, is classified as an accepted model
limitation: the model ignored the explicit Idiom boundary and treated *den
Nagel auf den Kopf treffen* as a sentence-valued Proverb. Finalization reparsed
and rebound every successful raw provider output before recomputing the score.
This retained historical run used the then-current `gpt-5-nano`/high policy;
all new Dumgen generation uses the shared `gpt-5.6-luna`/none policy.

## Textual source and transcription policy

The category authority for every positive Lemma is the Leibniz Institute for
the German Language's
[OWID Sprichwörterbuch complete list](https://www.owid.de/service/stichwortlisten/sprw).
OWID describes this resource as a corpus-based scientific lexicographic
documentation of current fixed German sentence forms and defines the displayed
Sprichwort name as the normally most frequent sentence-valued Kernform. See
[About the dictionary](https://www.owid.de/wb/sprw/ueber.html) and its
[usage and variant policy](https://www.owid.de/wb/sprw/hilfe/hinweise.html).

The exact positive-family mapping is:

- `Morgenstund hat Gold im Mund` — OWID complete list; independently discussed
  explicitly as a proverb by
  [Duden](https://www.duden.de/sprachwissen/sprachratgeber/Morgenstund-hat-Gold-im-Mund).
- `Aller Anfang ist schwer` — [OWID article 404225](https://www.owid.de/artikel/404225).
- `Was du heute kannst besorgen, das verschiebe nicht auf morgen` — OWID
  complete list; independently attested in the proofread
  [Wikisource edition of *Lieutenant Gustl*](https://de.wikisource.org/wiki/Seite:Schnitzler_Leutnant_Gustl.djvu/059).
- `Andere Länder, andere Sitten` — [OWID article 404233](https://www.owid.de/artikel/404233).
- `Ende gut, alles gut` — [OWID article 401702](https://www.owid.de/artikel/401702).
- `Übung macht den Meister` — [OWID article 401787](https://www.owid.de/artikel/401787).
- `Viele Köche verderben den Brei` — [OWID article 401852](https://www.owid.de/artikel/401852).
- `Wer anderen eine Grube gräbt, fällt selbst hinein` — [OWID article 401865](https://www.owid.de/artikel/401865).
- `Wer zuletzt lacht, lacht am besten` — [OWID article 401884](https://www.owid.de/artikel/401884).
- `Stille Wasser sind tief` — [OWID article 401836](https://www.owid.de/artikel/401836).
- `Gelegenheit macht Diebe` — [OWID article 401658](https://www.owid.de/artikel/401658).
- `Der Apfel fällt nicht weit vom Stamm` — [OWID article 401688](https://www.owid.de/artikel/401688).
- `Kleinvieh macht auch Mist` — [OWID article 401723](https://www.owid.de/artikel/401723).
- `Lügen haben kurze Beine` — OWID complete list.
- `Reden ist Silber, Schweigen ist Gold` — [OWID article 401829](https://www.owid.de/artikel/401829).
- `Wer rastet, der rostet` — [OWID article 401798](https://www.owid.de/artikel/401798).

Punctuation is transcribed in context but excluded from grammatical membership
and from `canonicalForm`, following the existing Aphorism route and Dumgen's
`ResolvableText` boundary. The scored corpus uses exact modern OWID Kernformen
apart from the explicit `Anfank` typo perturbation. Wikisource, Project
Gutenberg, or a Duden entry under the mixed heading “Wendungen, Redensarten,
Sprichwörter” is corroboration rather than sole category authority.

OWID documents both formal variants and recurrent lexical component
replacements. The corpus-only `Andere Zeiten, andere Sitten` and `Wer rastet,
rostet` cases preserve the unresolved identity question. They are not scored
until the project decides whether such forms are Variant Surfaces of the
Kernform Lemma or separate Lemmas under the current empty-Core codec.

## Deferred runtime registration

The Prompt Source is registered only for generated-system-prompt assembly, and
the prototype runner is exposed through the package script. Catalog and runtime
dispatch wiring remain deferred to issue #54.
