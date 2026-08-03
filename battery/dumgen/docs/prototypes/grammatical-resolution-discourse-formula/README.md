# German Phraseme/DiscourseFormula Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/phraseme/discourse-formula` Prompt Source. Its
Golden Corpus has 29 explicit cases: four minimized demonstrations, 20
disjoint held-out cases, and five corpus-only role-ambiguity and boundary
comparisons. Demonstration and evaluation selection are external to stable case
IDs.

The DTO is derived from Dumling's German Phraseme/DiscourseFormula schemas. The
route-local codec fixes Lemma `language`, `family`, and `kind`, plus Surface
`language` and the Lemma link. The model returns only Citation Surfaces; there
is no Inflection branch or inflectional feature bag. Lemma Core Features contain
only the nullable scalar `discourseFormulaRole`. Resolved formulae require at
least two marked members.

Under [ADR 0002](../../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md),
Core Features participate in grammatical Lemma identity. Two entries with the
same `canonicalForm` but different `discourseFormulaRole` values are therefore
distinct grammatical Lemmas. Context supplies evidence for one of those
identities; it does not mutate a single Lemma from occurrence to occurrence. A
null role is a separate identity used only when the
multiword formula is established but none of the ten enum roles is
grammatically established.

The scored suite covers all ten role values across demonstrations and
held-outs: Greeting, Farewell, Apology, Thanks, Acknowledgment, Refusal,
Request, Reaction, Initiation, and Transition. It also covers spelling repair,
ordinary initial casing, internal German noun capitalization, semantic member
scope, partial formulae, repeated and unrelated occurrences, and
boundaries to single-word INTJ/lexical material, ordinary compositional
requests, Collocation, Idiom, Proverb, and arbitrary quotation.

## Authoritative formula-to-role provenance

Every scored positive family has direct high-trust evidence for the formula's
interactional function. Where a dictionary describes the lexical function and
the case context supplies the speech-act contrast, both are named below.

| Golden case family | Role | Direct provenance and function |
| --- | --- | --- |
| `guten-morgen`; `herzlich-wilkommen-typo` | Greeting | [IDS grammis: *grüßen*](https://grammis.ids-mannheim.de/verbs/view/400670) attests *Guten Morgen* as a greeting; [Duden: *herzlich willkommen*](https://www.duden.de/rechtschreibung/herzlich_willkommen) defines the expression as a welcoming greeting. |
| `tut-mir-leid` | Apology | [IDS grammis: *leidtun*](https://grammis.ids-mannheim.de/verbs/view/400735/2) states that *(es) tut mir leid* frequently introduces an apology or regret; the scored context explicitly identifies speaker-caused harm and an apology. The sympathy context remains a null-role control. |
| `wie-dem-auch-sei` | Transition | [Stein, IDS: *Formelhaftigkeit und Routinen in mündlicher Kommunikation*](https://ids-pub.bsz-bw.de/files/9287/Stein_Formelhaftigkeit_und_Routinen_in_m%C3%BCndlicher_Kommunikation_Jb2003.pdf) classifies *wie dem auch sei* as a conversation-specific formula for regulating communication, specifically topic change, continuation, or closure; the scored context closes one debate and continues. |
| `auf-wiedersehen`; `bis-bald` | Farewell | [Duden: *verabschieden*](https://www.duden.de/rechtschreibung/verabschieden) connects *Auf Wiedersehen sagen* with taking leave; [Duden: *bald*](https://www.duden.de/rechtschreibung/bald) explicitly labels *bis bald* an informal farewell formula. |
| `vielen-dank`; `besten-dank` | Thanks | [Duden: *Dank*](https://www.duden.de/rechtschreibung/Dank) defines *Dank* as expressed gratitude and lists both *vielen Dank* and *besten Dank*. |
| `gern-geschehen` | Acknowledgment | [Duden: *geschehen*](https://www.duden.de/rechtschreibung/geschehen) labels *gern geschehen* a politeness formula used in reaction to someone's thanks. This response-to-thanks function is the route enum's Acknowledgment identity. |
| `nein-danke` | Refusal | [Duden: *danke*](https://www.duden.de/rechtschreibung/danke) explicitly describes *nein danke!* as a politeness formula that reinforces refusal of an offer; [Duden: *nein*](https://www.duden.de/rechtschreibung/nein) defines the negative answer and rejection function. |
| `darf-ich-bitten` | Request | [Duden: *bitten*](https://www.duden.de/rechtschreibung/bitten) gives *darf ich bitten?* as an invitation to dance, and [Duden: *dürfen*](https://www.duden.de/rechtschreibung/duerfen) classifies this use as a wish, request, or prompt. |
| `dann-wollen-wir-mal` | Initiation | [Duden: *wollen*](https://www.duden.de/rechtschreibung/wollen_moechten_wuenschen) explains *[na] dann wollen wir mal!* as proposing to start or begin something. |
| `ach-du-meine-guete` | Reaction | [Duden: *Güte*](https://www.duden.de/rechtschreibung/Guete) identifies *[ach] du meine/liebe Güte!* as an exclamation of fright, amazement, or surprise. |

`auf jeden Fall` is deliberately absent from scored evidence. Duden supports
its meaning of emphatic certainty, but that does not directly establish the
route's generic `Reaction` role. Because the enum has no Affirmation or
Confirmation value, the occurrence is retained as a corpus-only null-role
identity instead of guessing a scored mapping.

## Scalar role and same-form identity

A resolved occurrence selects one grammatical Lemma identity, not an array of
possible functions. Two `bitte schön` contexts expose the same-form tension:
presentation after a request has no grammatically established enum role and
therefore uses the null-role identity, while a bakery order supports the
Request identity. An explicit apology after speaker-caused harm supports the
Apology identity for `tut mir leid`; sympathy for harm the speaker did not cause
uses the separate null-role identity because Sympathy is absent from the enum.
These pairs share contamination keys and remain unscored. The emphatic
affirmation `auf jeden Fall`, for which the enum has no fitting role, and the
embedded adverbial use of `auf keinen Fall` are also corpus-only.

[IDS grammis: Satzadverbialia](https://grammis.ids-mannheim.de/systematische-grammatik/1315)
establishes the ordinary embedded negative-adverbial use of `auf keinen Fall`;
that case is a route-boundary control and is not scored as a discourse-act
formula.

## Bounded evidence runner

The runner is prepared for exactly one serial call per held-out case with
`gpt-5.6-luna`, no reasoning, a 16,384-token output budget, zero retries, and
`store: false`. It preserves raw provider output and complete response metadata
on parse failures. Draft results are written atomically and are bound by hashes
to the exact prompt, schemas, inputs, ideals, model settings, and suite order.
Finalization reparses each successful attempt's retained raw provider text,
exact-compares it with the retained structured output, recomputes every
diagnostic offline, rejects stale bindings, tampering, and provider errors, and
requires a human classification plus explanation for each miss. Evidence
qualifies at 15 calls, at least 80% exact-contract score, zero execution errors,
and zero unclassified misses.

A finalized 20-case run is retained at
`runs/2026-08-03T14-31-39-814Z/results.json`. It scored 16/20 (80%), had zero
provider errors, and has no unclassified misses. The four misses are classified
as accepted model limitations: `darf-ich-bitten` preserved initial casing and
selected Initiation rather than Request; `herzlich-wilkommen-typo` repaired the
typo but capitalized adjectival *willkommen*; the compositional request was
accepted despite the lexicalization boundary; and attributive *gute Reise* was
accepted despite the independent-interactional-act boundary. Finalization
reparsed and rebound every successful raw provider output before recomputing the
score. This retained historical run used the then-current `gpt-5-nano`/high
policy; all new Dumgen generation uses the shared `gpt-5.6-luna`/none policy.

Shared catalog and runtime integration are owned by issue #54. A fresh explicit
run can invoke:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-discourse-formula/run.ts
```

To finalize a retained draft offline, create a JSON sidecar keyed by every
failed case with `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation` and a non-empty explanation, then run:

```sh
bun docs/prototypes/grammatical-resolution-discourse-formula/run.ts finalize \
  docs/prototypes/grammatical-resolution-discourse-formula/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-discourse-formula/runs/<timestamp>/miss-classifications.json
```
