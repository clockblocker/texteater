# German Lexeme/DET Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/determiner` Prompt Source. Its Golden Corpus
contains 29 cases covering articles, demonstrative/interrogative/negative/
indefinite/total and possessive determiners, contextual agreement, citation,
normalization, lexical DET/PRON and DET/NUM boundaries, Fusion contractions,
formal possessive capitalization, and target scope. Eight cases are
demonstrations and 19 settled, explicit cases
form the disjoint held-out evaluation suite. Two policy cases remain corpus-only:
feminine agreement is not representable by the current DET codec, and the
Surface kind for contextual uninflected determiners still needs a domain ruling.
Resolved demonstration Lemmas do not occur in held-out scoring.

The eight demonstrations each carry a separate burden:

- `der` separates stable article features from contextual agreement;
- possessive `meinem` separates possessor identity and number from agreement;
- possessive `eurem` makes plural `Number[psor]` explicit on the lemma-disjoint
  `euer`, without promoting the held-out `unserem` failure;
- entry-label `irgendein` establishes Citation Surface behavior;
- standalone `jener` establishes the lexical, not syntactic, DET/PRON boundary;
- relative `der` establishes the homonymous PRON boundary;
- `zum` establishes the Fusion boundary; and
- overbroad `dieser alte` establishes lexical target scope.

The route resolves exactly one TARGET pair. Held-out boundaries cover both
unrelated multiple targets and repeated occurrences of the same determiner
Lemma. Formal `Ihr`/`Ihrem` remains capitalized during normalization and carries
`Person=2|Polite=Form`, unlike third-person possessive `ihr`.

The prompt treats its DET subclass matrix as mandatory rather than suggestive:
articles use `PronType=Art` and `Definite=Def|Ind`, only article `ein` adds
`NumType=Card`, demonstrative/interrogative/negative/indefinite/total
determiners use `Dem|Int|Neg|Ind|Tot`, and `beide` additionally uses
`NumType=Card`. Personal possessives use `PronType=Prs|Poss=Yes|Person=...`
with `NumType=null`. Nullable keys remain required in the selected schema
object; `null` records an absent or unestablished value and never licenses
omitting the key.

Possessor number is lexicalized as singular for `mein`, `dein`, and `sein`, and
plural for `unser` and `euer`. Case, gender, and number without the `[psor]`
layer always agree with the possessed noun phrase. The contextual `Er ...
seinen` case keeps `Gender[psor]=Masc`: Dumling's route policy resolves the
explicit masculine possessor from context, while broader German annotation can
leave a masculine/neuter form-level tension when no referent establishes the
possessor gender. Plural agreement does not suppress the modified noun's scored
gender for `alle` or `beide`.

Before returning, the prompt now requires a normalization self-check:
`normalizedSurface` preserves contextual inflection, every repair of marked
characters forces `Typo`, and the model must not copy `canonicalForm` into the
Surface unless it actually matches the normalized contextual form.

The bounded runner makes one serial call per held-out case with the shared
`gpt-5.6-luna` model, no reasoning effort, no retries,
`store: false`, and a 16,384-token output cap. Before constructing a provider
client it parses the 19-case suite through the authored Prompt Source's exact
schemas. Every retained run binds the ordered case IDs and current Golden Cases,
assembled prompt and schema hashes, route-local model and generation policy,
runner version, response metadata, field-level diagnostics, and errors. The
catalog maximum output value remains retained for observability but does not
select this route's model or output allowance. Draft and finalized results are
written atomically. Imports, tests, validation, and finalization never call a
provider.

Runner v2 changes only reasoning effort from low to medium. Two low-effort
post-fix runs produced different isolated feature misses while using the same
2,048-token output budget without truncation; many calls spent 768–1,024 tokens
on reasoning. The higher effort is therefore bound as evidence policy rather
than weakening the prompt or held-out oracles. Runner v3 keeps medium effort and
raises the output allowance to 4,096 after the similarly structured ADV route
showed that medium reasoning can exhaust all 2,048 tokens before emitting
structured output. DET's denser feature object receives the same headroom so
reasoning truncation cannot masquerade as grammatical evidence. A subsequent
v3 DET probe reached `max_output_tokens` on formal `Ihrem` at case 10, so its
partial observations were not retained. Runner v4 raises the allowance to 8,192
while keeping medium effort and every held-out input fixed.

The prompt paired with runner v4 adds only the necessary `eurem` demonstration.
Its `euer` Lemma does not occur in held-out scoring, its input is distinct from
every held-out input, and the repeatedly missed `unserem` case remains held out.
Demonstration and evaluation selections remain guarded by exact ID,
input-fingerprint, contamination-key, and resolved-Lemma disjointness checks.

Historical `gpt-5-nano` runs at both low and medium reasoning plateaued
between 9 and 15 exact passes out of 19 despite explicit route rules and the
targeted demonstration. Runner v5 attempted to isolate model capability with
`gpt-5-mini`, but every case returned HTTP 403; the project model listing
then exposed only `gpt-5-nano`. No v5 result qualifies as evidence. The retained
historical Runner v6 evidence therefore pins `gpt-5-nano` with high reasoning.
Because a
medium-reasoning probe already exhausted 4,096 output tokens once, v6 raises the
safety allowance to 16,384 so reasoning truncation does not become a false
grammatical miss. The retained schema rejects mini and v5 results. All future
Dumgen generation, including
[#54](https://github.com/clockblocker/texteater/issues/54), uses the shared
`gpt-5.6-luna`/none policy described above.

After root integration registers the Prompt Source and package command, run the
live evaluation explicitly from `battery/dumgen`:

```sh
bun run prototype:grammatical-resolution-determiner
```

The live command retains `runs/<timestamp>/results.json` and exits unsuccessfully
because human miss classification is mandatory. Provider errors require a fresh
run.

## Evidence finalization

For every scored miss, create a sidecar keyed by case ID:

```json
{
  "grammar-de-det-example": {
    "classification": "prompt-defect",
    "explanation": "The prompt does not state the applicable boundary."
  }
}
```

Classifications are `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`. Finalize offline:

```sh
bun run docs/prototypes/grammatical-resolution-determiner/run.ts finalize \
  docs/prototypes/grammatical-resolution-determiner/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-determiner/runs/<timestamp>/miss-classifications.json
```

Finalization rejects obsolete prompt, catalog, suite, Golden Case, schema, or
runner-policy bindings and recomputes every diagnostic and summary. Evidence
qualifies only with at least 15 attempts, an exact-contract score of 80% or
better, zero execution errors, and explicit classification of every scored miss.
