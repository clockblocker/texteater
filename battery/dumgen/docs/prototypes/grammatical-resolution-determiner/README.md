# German Lexeme/DET Grammatical Resolution evaluation

This route-local evaluation implements the classified-target contract for
`grammatical-resolution/de/lexeme/determiner`. It does not change catalog,
runtime assembly, or the generated System Prompt.

## Model contract

The input is exactly:

```ts
{ markedContext: string; members: string[] }
```

Both fields are authoritative projections of an already-classified target.
The prompt never rejects, repairs, adds, removes, reorders, or reclassifies
membership. Its total flat output is exactly:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: CitationSurface | InflectionSurface;
  lemma: {
    canonicalForm: string;
    coreFeatures: {
      definite: "Def" | "Ind" | null;
      extPos: "ADV" | "DET" | null;
      foreign: "Yes" | null;
      numType: "Card" | "Ord" | null;
      person: "1" | "2" | "3" | null;
      polite: "Form" | "Infm" | null;
      poss: "Yes" | null;
      pronType: "Art" | "Dem" | "Emp" | "Exc" | "Ind" | "Int" |
        "Neg" | "Prs" | "Rel" | "Tot" | null;
    };
  };
}
```

The Surface union and Lemma are derived from Dumling's German DET codecs.
Citation has no Inflectional Features. Inflection has nullable case, degree,
agreement gender/number, and possessor gender/number, with at least one
non-null value. The application owns language, route discriminants,
Surface-to-Lemma linkage, normalized Surface, successful resolution, and
`realizationCoverage: "Full"`.

## Frozen corpus partitions

The corpus contains 42 realistic full-sentence occurrences: 9 demonstrations,
21 development cases, and 12 untouched acceptance cases. The partitions are
pairwise disjoint and their sizes, case identities, and exact TARGET/member
projection are pinned by focused tests.

Together they cover definite and indefinite articles; demonstrative,
emphatic, exclamative, indefinite, interrogative, negative, possessive,
relative, and total determiners; cardinal and ordinal identity; ExtPos and
Foreign; all four cases; singular/plural and supported agreement gender;
comparative/superlative degree; possessor person, gender, number, and formal
politeness; Citation versus Inflection; sentence-initial and formal casing;
typo repair; licensed variants; invariant and archaic forms. Route anchors
keep standalone DET distinct from PRON, quantifying DET distinct from ADJ and
NUM, and an unmarked adposition-article fusion in context outside membership.

The lexical boundary policy and feature inventory follow
[UD German DET](https://universaldependencies.org/de/pos/DET.html) and
[UD German GSD](https://universaldependencies.org/treebanks/de_gsd/index.html).
The case sentences are synthetic and do not copy source text.

## Shared evidence runner

The thin route configuration uses the shared direct Responses runner with the
repository model policy, no reasoning, zero retries, `store: false`, explicit
30-minute prompt caching, and a 4,096-token output ceiling. It supports three
classified development rounds followed by one suite-bound untouched
acceptance run. Acceptance cannot start until rounds 1, 2, and 3 are finalized
with zero execution errors and every scored miss classified.

The complete protocol is 75 provider calls: `21 × 3` development calls plus
`12 × 1` acceptance calls. No live call was made during deterministic
implementation. Expected usage is well below $0.20 with prompt caching. Even
the pessimistic full-output-cap calculation leaves the route under roughly
$2.50, below the issue's $5 leaf ceiling. Retained provider usage is
authoritative after each authorized run.

Run deterministic preflight from `battery/dumgen`:

```sh
bun docs/prototypes/grammatical-resolution-determiner/run.ts \
  preflight development 1
```

After explicit authorization, run a development round with:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-determiner/run.ts \
  run development 1
```

Classify every scored miss, finalize offline, and repeat for rounds 2 and 3.
Only then may the suite-bound acceptance command run once.

Existing retained results under `runs/` were produced by legacy DET contracts
and runners. They remain historical evidence only and cannot satisfy this
contract's binding or untouched-acceptance protocol.

## Retained classified evidence

The authorized protocol and three evidence-driven acceptance replacements ran
on 2026-08-13. All 300 direct serial calls completed without execution errors,
and every miss is finalized with a classification. Exact failed cases remained
held out; no failed case became a demonstration.

| Phase | Retained result | Score | Disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T11-08-49-701Z/results.json` | 7/21 | Ten prompt defects and four corpus defects; corrected three UD lemmas and the invariant foreign Surface, then strengthened the general rules |
| Development 2 | `runs/2026-08-13T11-11-26-739Z/results.json` | 14/21 | Seven prompt defects; clarified case governance, comparative identity, plural lexical gender, and possessor evidence |
| Development 3 | `runs/2026-08-13T11-12-50-816Z/results.json` | 18/21 | Three accepted limitations after the relevant rules were already explicit |
| Untouched acceptance v1 | `runs/2026-08-13T11-14-08-325Z/results.json` | 7/12 | One prompt defect, three corpus defects, one accepted limitation; failed evidence and reservation retained |
| Recovery development 1 | `runs/2026-08-13T11-17-48-612Z/results.json` | 18/21 | Three accepted limitations |
| Recovery development 2 | `runs/2026-08-13T11-18-39-149Z/results.json` | 19/21 | Two accepted limitations |
| Recovery development 3 | `runs/2026-08-13T11-19-34-121Z/results.json` | 17/21 | Four accepted limitations |
| Untouched acceptance v2 | `runs/2026-08-13T11-20-30-843Z/results.json` | 9/12 | One accepted limitation and two corpus defects; no prompt defect |
| Recovery v3 development 1 | `runs/2026-08-13T11-29-44-042Z/results.json` | 17/21 | Four accepted limitations |
| Recovery v3 development 2 | `runs/2026-08-13T11-30-43-580Z/results.json` | 19/21 | Two accepted limitations |
| Recovery v3 development 3 | `runs/2026-08-13T11-31-51-296Z/results.json` | 17/21 | Four accepted limitations |
| Untouched acceptance v3 | `runs/2026-08-13T11-32-54-836Z/results.json` | 9/12 | Three accepted limitations; no prompt or corpus defect |
| Recovery v4 development 1 | `runs/2026-08-13T11-40-17-923Z/results.json` | 16/21 | Five accepted limitations |
| Recovery v4 development 2 | `runs/2026-08-13T11-41-30-921Z/results.json` | 17/21 | Four accepted limitations |
| Recovery v4 development 3 | `runs/2026-08-13T11-42-27-754Z/results.json` | 16/21 | Five accepted limitations |
| Untouched acceptance v4 | `runs/2026-08-13T11-43-32-983Z/results.json` | 12/12 | Clean threshold-passing terminal evidence; no misses |

Acceptance v1 exposed a general typo-policy defect: the model repaired `Diser`
but called the normalized Surface a Variant. The prompt now states that an
actual typo uses `memberOrthographies: ["Typo"]` while the repaired Surface
remains Canonical; Variant is reserved for accepted alternatives such as `ne`
or `nen`. All twelve v1 acceptance IDs, sentences, inputs, and oracles were
replaced before the fresh post-failure development sequence and v2 run.

Acceptance v2's `beiden Teams` miss repeated the documented plural-gender
limitation: it returned Masc/Neut syncretism instead of the noun's known Neut
gender. The other two misses revealed invalid or fragile oracles (`manche`
requires the UD lemma `mancher`; the metalinguistic `welchselbiger` case did not
defensibly fix Citation and its expected lemma). Neither is evidence for a
prompt change. The shared protocol permitted a corpus-defect replacement
without another prompt change. All twelve v2 cases were replaced, three fresh
post-v2 development rounds were finalized under the unchanged prompt, and v3
was reserved and run once.

V3 is a valid suite with no replaceable defect. Its three misses are accepted
limitations: the established `welcher` citation-form truncation, the analogous
`mancher` to `manch` truncation, and a spurious typo repair of the explicitly
quoted and independently attested archaic form `welchselbig`. At 9/12, v3
remains below the configured 80% threshold, so the ticket stays open for the
orchestrator's integration/evidence decision rather than claiming threshold
success. The below-threshold limitation-recovery protocol then required an
evidence-driven prompt change and another wholly fresh suite. V4 teaches the
full `welcher` and `mancher` paradigm citation forms with different examples
and preserves explicitly quoted archaic spellings literally. After three
fresh bound development rounds, v4 acceptance passed 12/12 with no misses,
making the evidence terminal under the shared policy.

The modern runs retained 900,955 input tokens, including 876,468 cached tokens
and 14,376 cache-write tokens, plus 38,865 output tokens. Applying the published
Luna rates and the 1.25× cache-write multiplier gives an estimated cumulative
cost of about `$0.349`, safely below the authorized `$5` ceiling.
