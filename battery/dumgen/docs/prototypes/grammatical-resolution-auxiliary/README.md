# German Lexeme/AUX Grammatical Resolution evaluation

This route-local evaluation implements the classified-target contract for
`grammatical-resolution/de/lexeme/auxiliary`. It does not change catalog or
runtime assembly and does not edit the generated System Prompt.

## Model contract

The legacy model input was `{ markedContext }`. Its output contained a
`Resolved | Unresolved` decision, nullable `resolution`, and model-owned
realization coverage. The current input is exactly:

```ts
{ markedContext: string; members: string[] }
```

Both fields are authoritative projections of an already-classified target.
The prompt never repairs, rejects, adds, removes, reorders, or reclassifies
membership. The total flat output is exactly:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: CitationSurface | InflectionSurface;
  lemma: {
    canonicalForm: string;
    coreFeatures: { verbType: "Mod" | null };
  };
}
```

The Lemma and Surface union are derived from Dumling's German AUX codecs. The
model owns Citation versus Inflection, spelling, Surface Features, AUX
Inflectional Features, canonical form, and the AUX-only `verbType`. `Mod` is
used for meaning-bearing modal auxiliaries and null for copular, perfect,
future, and passive auxiliaries. No VERB-only feature is present. The
application owns language, route discriminants, Surface-to-Lemma linkage,
normalized Surface, successful resolution, and `realizationCoverage: "Full"`.

The provider-safe Inflection schema preserves every codec branch: finite
indicative/subjunctive, finite imperative, infinitive, participle, and the
non-empty compatibility shape with null `verbForm`. Nullable finite fields
represent genuine syncretism or missing context. Passive-forming `werden` uses
`voice: "Pass"`; future-forming `werden` and non-passive AUX uses keep voice
null.

## Frozen corpus partitions

The corpus contains 36 realistic full-sentence resolved occurrences. Its
partitions are pairwise disjoint and frozen by grammatical coverage.

Demonstrations (6):

- `grammar-de-aux-demo-future-wird`
- `grammar-de-aux-demo-modal-kann`
- `grammar-de-aux-demo-copula-ist`
- `grammar-de-aux-demo-citation-duerfen`
- `grammar-de-aux-demo-imperative-sei`
- `grammar-de-aux-demo-typo-sol`

Development (18):

- `grammar-de-aux-dev-perfect-hat-gegessen`
- `grammar-de-aux-dev-perfect-waren-gegangen`
- `grammar-de-aux-dev-passive-wird-repariert`
- `grammar-de-aux-dev-passive-wurde-gesperrt`
- `grammar-de-aux-dev-copula-bin-muede`
- `grammar-de-aux-dev-subjunctive-sei-gegangen`
- `grammar-de-aux-dev-subjunctive-waeren-geblieben`
- `grammar-de-aux-dev-modal-darf-bleiben`
- `grammar-de-aux-dev-modal-wolltest-gehen`
- `grammar-de-aux-dev-modal-moechte-bleiben`
- `grammar-de-aux-dev-modal-sollen-syncretic`
- `grammar-de-aux-dev-infinitive-sein`
- `grammar-de-aux-dev-infinitive-passive-werden`
- `grammar-de-aux-dev-participle-gewesen`
- `grammar-de-aux-dev-participle-worden`
- `grammar-de-aux-dev-typo-mus`
- `grammar-de-aux-dev-variant-muss`
- `grammar-de-aux-dev-contrast-modal-mag`

Untouched acceptance (12):

- `grammar-de-aux-accept-perfect-ist-gegangen`
- `grammar-de-aux-accept-future-werden-abreisen`
- `grammar-de-aux-accept-passive-wurden-gerufen`
- `grammar-de-aux-accept-copula-war-ruhig`
- `grammar-de-aux-accept-subjunctive-haette`
- `grammar-de-aux-accept-modal-muessen`
- `grammar-de-aux-accept-modal-mag`
- `grammar-de-aux-accept-modal-wollt`
- `grammar-de-aux-accept-citation-sein`
- `grammar-de-aux-accept-infinitive-haben`
- `grammar-de-aux-accept-typo-koenen`
- `grammar-de-aux-accept-archaic-ward`

Together the partitions cover all six modal identities, copular `sein`,
perfect, future, and passive auxiliaries, lexical-homograph contrast in
distinguishing context, Citation, finite indicative and subjunctive,
imperative, infinitive, participle, person, number, tense, passive voice,
syncretic nullable mood, sentence-initial casing, genuine typos, licensed
pre-reform spelling, and an archaic passive form.

The route policy follows the [UD German language
overview](https://universaldependencies.org/de/) for AUX and modal identities,
and the IDS grammis descriptions of
[auxiliary-verb function](https://grammis.ids-mannheim.de/systematische-grammatik/1525)
and [modal verbs](https://grammis.ids-mannheim.de/systematische-grammatik/380).
The model field inventory itself is authoritative from the Dumling AUX codec.

## Shared evidence runner

The thin route configuration uses the shared direct Responses runner with the
repository model policy, no reasoning, zero retries, `store: false`, explicit
30-minute prompt caching, and a 4,096-token output ceiling. It supports three
classified development rounds followed by one reserved untouched acceptance
run. Acceptance cannot start until rounds 1, 2, and 3 are finalized with zero
execution errors and every scored miss classified.

The complete protocol is 66 provider calls: `18 × 3` development calls plus
`12 × 1` acceptance calls. No live call was made during deterministic
implementation. With Luna's published $1.00/M input, $0.10/M cached input,
and $6.00/M output prices, the expected cost is below $0.15 after prompt
caching. Even the pessimistic assumption that all 66 calls consume their full
4,096-token output cap and all input is uncached remains below about $1.80.
Retained provider usage is authoritative after each run. See the
[OpenAI API pricing page](https://openai.com/api/pricing/).

Run deterministic preflight from `battery/dumgen`:

```sh
bun docs/prototypes/grammatical-resolution-auxiliary/run.ts \
  preflight development 1
```

After explicit authorization, run a development round with:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-auxiliary/run.ts \
  run development 1
```

Classify every scored miss as `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, then finalize
offline:

```sh
bun docs/prototypes/grammatical-resolution-auxiliary/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-auxiliary/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-auxiliary/runs/<timestamp>/miss-classifications.json
```

After three finalized development rounds, acceptance is consumed once:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-auxiliary/run.ts run acceptance
```

The retained 2026-08-03 evidence predates this input, output, corpus, model
binding, and phase protocol. It is historical only and cannot satisfy the
current binding.

## Retained classified evidence

The authorized protocol completed on 2026-08-13 with 66 serial provider calls,
zero execution errors, and every development miss classified.

| Phase | Retained result | Score | Miss disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T10-25-04-139Z/results.json` | 16/18 (88.9%) | Two prompt defects: modal `möchte` mood/tense and context-damaged syncretic `sollen` mood |
| Development 2 | `runs/2026-08-13T10-26-09-789Z/results.json` | 17/18 (94.4%) | `möchte` and null mood fixed; one prompt defect remained because null mood incorrectly erased overt first-person plural evidence |
| Development 3 | `runs/2026-08-13T10-27-02-573Z/results.json` | 18/18 (100%) | None |
| Untouched acceptance | `runs/2026-08-13T10-27-46-365Z/results.json` | 12/12 (100%) | None |

After round 1, the prompt explicitly mapped present-day modal `möchte` to the
Konjunktiv-II representation `mood: "Sub"`, `tense: "Past"`, and required null
mood for an indicative/subjunctive-syncretic modal form when deliberately
damaged context cannot disambiguate it. Round 2 passed both distinctions but
dropped person on the null-mood case. The final repair states that mood
ambiguity does not erase person and number independently established by an
overt subject. Round 3 and untouched acceptance then passed completely. No
failed development case became a demonstration.

The selected round-3 and acceptance contract has prompt SHA
`8dcbb3d6c809a1f312c84bf7a8a086f247d1eb62bbdc8d42a1c1a5265ae4e162`.
The four retained runs report 224,469 input tokens, including 212,293 cached
tokens and 10,085 cache-write tokens, plus 6,254 output tokens. Applying the
published Luna rates and the 1.25× cache-write multiplier gives an estimated
total of `$0.07345055`, below the `$0.15` reserve and the authorized `$5` leaf
ceiling. The untouched acceptance reservation is retained at
`runs/acceptance-reservation.json`; the suite cannot be claimed untouched or
run again.
