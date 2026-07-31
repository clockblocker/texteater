# Segmentation Chain corpus and evaluation contract

Date: 2026-07-31  
Status: fixed evaluation contract for [issue #3][issue-3]

## Decision

Compare Segmentation Chain prompt experiments against the 28-case, eval-only
corpus below. An experiment may use any prompt strategy and intermediate output
representation, but its adapter must produce the canonical domain result before
scoring. This contract deliberately does not choose a production prompt or
model-output schema.

The corpus fixes the supported-language inventory to German, English, and
Hebrew. This makes Polish and Spanish valid `UnsupportedLanguage` controls.
Changing that inventory creates a new corpus version rather than silently
changing the gold decisions.

The authoritative result contract comes from the [Dumgen context][context] and
[issue #3][issue-3]:

- intake is exactly `Accepted`, `UnsupportedLanguage`, or `Unintelligible`;
- only `Accepted` produces one immutable `Segmented Sentence` with a stable
  `SegmentedSentenceId`;
- Segments have no global IDs and are addressed only by their zero-based array
  position;
- kinds are exactly `ResolvableText`, `OpaqueText`, `Whitespace`, and
  `Punctuation`;
- only `ResolvableText` is clickable, though every kind remains indexed;
- accepted input needs some useful supported-language material, not a numeric
  proportion;
- ordinary typos and licensed variants stay verbatim; only severe, intelligible
  structural corruption may be reconstructed;
- the accepted replacement text is authoritative and no source alignment is
  retained.

## Gold notation and boundary policy

The inventory uses `R`, `O`, `W`, and `P` for `ResolvableText`, `OpaqueText`,
`Whitespace`, and `Punctuation`. Concatenating the quoted values in a gold
array gives the exact authoritative replacement text. Adjacent `R` entries are
intentional distinct click atoms inside one orthographic word.

Gold boundaries use these rules:

1. Never split an extended grapheme cluster.
2. Preserve one maximal contiguous whitespace run as one `W`.
3. Preserve one punctuation grapheme as one `P`, including adjacent marks such
   as `?!` as two indexed Segments.
4. Preserve a maximal locally uninterpretable run as one `O`.
5. Use one `R` per ordinary orthographic text atom, except where visible Hebrew
   fused material has multiple useful click atoms.
6. Do not insert a covert or expanded lexical form during segmentation.

Unicode 17.0.0 defines default text boundaries over extended grapheme clusters
and explicitly permits a documented language- or task-specific profile
([UAX #29 revision 47][uax-29]). The profile above is therefore explicit:
Unicode grapheme boundaries are the atomic floor, while Dumgen's click atoms
are the task-level segments. This matters for Hebrew because one
whitespace-delimited orthographic token can contain multiple syntactic words,
and Hebrew UD specifically splits visible attached function words and
pronominal clitics
([UD tokenization overview][ud-tokenization], [UD Hebrew][ud-hebrew]).
Dumgen retains only visible material rather than UD's expanded analysis because
segmentation does not perform downstream linguistic resolution.

## Fixed corpus

The `class` column is the reporting stratum. `source` is passed byte-for-byte to
intake. `gold` is the exact decision and, for accepted cases, ordered Segment
array. In the table, `\t` and `\n` denote the actual tab and line-feed code
points rather than a backslash followed by a letter. A leading or trailing `W`
is retained when present.

| id | class | source | gold |
| --- | --- | --- | --- |
| `DE-CLEAN-01` | clean German | `Heute regnet es.` | `Accepted`: `R("Heute"), W(" "), R("regnet"), W(" "), R("es"), P(".")` |
| `DE-CLEAN-02` | clean German | `Die Haustür steht offen.` | `Accepted`: `R("Die"), W(" "), R("Haustür"), W(" "), R("steht"), W(" "), R("offen"), P(".")` |
| `DE-CLEAN-03` | clean German | `Zum Frühstück gibt es Brötchen.` | `Accepted`: `R("Zum"), W(" "), R("Frühstück"), W(" "), R("gibt"), W(" "), R("es"), W(" "), R("Brötchen"), P(".")` |
| `DE-CLEAN-04` | clean German | `„Guten Morgen“, sagte sie.` | `Accepted`: `P("„"), R("Guten"), W(" "), R("Morgen"), P("“"), P(","), W(" "), R("sagte"), W(" "), R("sie"), P(".")` |
| `DE-BOUND-01` | punctuation | `Hallo, Welt!` | `Accepted`: `R("Hallo"), P(","), W(" "), R("Welt"), P("!")` |
| `DE-BOUND-02` | punctuation and whitespace | `Wirklich?!  Ja.\n` | `Accepted`: `R("Wirklich"), P("?"), P("!"), W("  "), R("Ja"), P("."), W("\n")` |
| `DE-BOUND-03` | punctuation inside text | `E-Mail-Adresse` | `Accepted`: `R("E"), P("-"), R("Mail"), P("-"), R("Adresse")` |
| `DE-BOUND-04` | tab and repeated space | `Eins,\tzwei  drei.` | `Accepted`: `R("Eins"), P(","), W("\t"), R("zwei"), W("  "), R("drei"), P(".")` |
| `DE-BOUND-05` | nested punctuation | `Er sagte: „Nein.“` | `Accepted`: `R("Er"), W(" "), R("sagte"), P(":"), W(" "), P("„"), R("Nein"), P("."), P("“")` |
| `DE-PRESERVE-01` | ordinary typo | `Das ist nähmlich schwierig.` | `Accepted`: `R("Das"), W(" "), R("ist"), W(" "), R("nähmlich"), W(" "), R("schwierig"), P(".")` |
| `DE-PRESERVE-02` | ordinary typo | `Ich habe das garnicht gewusst.` | `Accepted`: `R("Ich"), W(" "), R("habe"), W(" "), R("das"), W(" "), R("garnicht"), W(" "), R("gewusst"), P(".")` |
| `DE-PRESERVE-03` | licensed variant | `Der Delphin schwimmt schnell.` | `Accepted`: `R("Der"), W(" "), R("Delphin"), W(" "), R("schwimmt"), W(" "), R("schnell"), P(".")` |
| `DE-PRESERVE-04` | licensed variants | `Das ist aufwändig und aufwendig.` | `Accepted`: `R("Das"), W(" "), R("ist"), W(" "), R("aufwändig"), W(" "), R("und"), W(" "), R("aufwendig"), P(".")` |
| `RECON-01` | severe structural corruption | `Ichgeh heute nachHause.` | `Accepted`: `R("Ich"), W(" "), R("geh"), W(" "), R("heute"), W(" "), R("nach"), W(" "), R("Hause"), P(".")` |
| `RECON-02` | severe structural corruption | `Wirkönnenmorgenkommen.` | `Accepted`: `R("Wir"), W(" "), R("können"), W(" "), R("morgen"), W(" "), R("kommen"), P(".")` |
| `RECON-03` | required noisy atom case | `bra w u r him frfr` | `Accepted`: `R("braw"), W(" "), R("u"), W(" "), R("r"), W(" "), R("him"), W(" "), R("frfr")` |
| `RECON-04` | severe structural corruption | `HeuteistdasWettergut.` | `Accepted`: `R("Heute"), W(" "), R("ist"), W(" "), R("das"), W(" "), R("Wetter"), W(" "), R("gut"), P(".")` |
| `MIXED-01` | accepted with local opaque text | `Ich treffe blorx morgen.` | `Accepted`: `R("Ich"), W(" "), R("treffe"), W(" "), O("blorx"), W(" "), R("morgen"), P(".")` |
| `MIXED-02` | accepted with local opaque text | `Heute ist xqz!! alles gut.` | `Accepted`: `R("Heute"), W(" "), R("ist"), W(" "), O("xqz"), P("!"), P("!"), W(" "), R("alles"), W(" "), R("gut"), P(".")` |
| `MIXED-03` | accepted with local opaque text | `Das ist 🫠 kompliziert.` | `Accepted`: `R("Das"), W(" "), R("ist"), W(" "), O("🫠"), W(" "), R("kompliziert"), P(".")` |
| `UNINT-01` | unintelligible | `jfdksl qweoi zmxncb` | `Unintelligible` |
| `UNINT-02` | unintelligible | `qxv zzkk rrppf` | `Unintelligible` |
| `UNSUP-01` | valid unsupported Polish | `To jest piękny dzień.` | `UnsupportedLanguage` |
| `UNSUP-02` | valid unsupported Spanish | `Mañana iremos al mercado.` | `UnsupportedLanguage` |
| `HE-FUSED-01` | Hebrew visible fused prefixes | `הילד בבית.` | `Accepted`: `R("ה"), R("ילד"), W(" "), R("ב"), R("בית"), P(".")` |
| `HE-FUSED-02` | Hebrew prefix and pronominal suffix | `וספרו נמצא כאן.` | `Accepted`: `R("ו"), R("ספר"), R("ו"), W(" "), R("נמצא"), W(" "), R("כאן"), P(".")` |
| `HE-FUSED-03` | Hebrew object suffix | `אהבתיה.` | `Accepted`: `R("אהבתי"), R("ה"), P(".")` |
| `HE-FUSED-04` | Hebrew stacked visible prefixes | `כשנגיע, נתקשר.` | `Accepted`: `R("כ"), R("ש"), R("נגיע"), P(","), W(" "), R("נתקשר"), P(".")` |

The official German spelling inventory lists `Delphin/Delfin` and
`aufwendig/aufwändig` as variants ([Amtliches Regelwerk 2024][de-rules]).
Those cases ensure that segmentation does not normalize a licensed spelling
away. The typo cases are intentionally ordinary and interpretable; their gold
text remains the source spelling under the Dumgen contract.

## Scoring contract

### Unit of evaluation

Run intake first. A wrong intake decision makes that case wrong and produces no
segmentation credit. For an accepted case, compare the canonical result after
the experiment-specific adapter:

1. the authoritative replacement string;
2. ordered `(start, end, kind)` Segment spans using zero-based, half-open
   `[start, end)` extended-grapheme-cluster offsets in that replacement;
3. click eligibility derived as `kind == ResolvableText`;
4. domain invariants enforced by the application boundary.

For a gold-accepted case with a wrong intake decision, treat the prediction as
an empty Segment set: every gold span is a false negative. If the decision is
accepted but the replacement string is wrong, span sets are not alignable:
their intersection is empty, every gold span is a false negative, and every
predicted span is a false positive. Thus neither failure mode disappears from a
denominator.

This is inspired by the official CoNLL 2018 evaluation's character-range
alignment and treatment of segmentation mismatches in precision, recall, and
F1 ([CoNLL 2018 evaluation][conll-eval]), but defines standalone Dumgen
boundary metrics with four kinds and a click contract.

### Required quality measures

Report every measure overall and by `class`; do not hide a weak edge-case class
inside a micro-average. Report a precision, recall, or F1 denominator of zero
as `N/A`, never as a perfect score.

| measure | definition |
| --- | --- |
| Intake Decision accuracy | Exact decision matches / 28; also report a 3×3 confusion matrix and macro recall across the three decisions. An adapter/provider failure counts wrong in accuracy and is reported in a separate failure column rather than being invented as one of the three decisions. |
| Authoritative-text exact match | Accepted cases whose concatenated Segment text equals the gold replacement / 24. A mismatch receives zero downstream span credit for that case. |
| Boundary F1 | Micro precision/recall/F1 over gold and predicted `(caseId, start, end)` span sets on gold-accepted cases, using the zero-match rule above when replacement text differs. |
| Boundary-and-kind F1 | Micro precision/recall/F1 over `(caseId, start, end, kind)` sets on gold-accepted cases. This is the primary segmentation measure. |
| Exact Segmented Sentence accuracy | Accepted cases with exact replacement, exact Segment count, order, texts, and kinds / 24. |
| Click-eligibility accuracy | Compare sets of `(caseId, start, end, clickable)` for every predicted and gold Segment, where `clickable` must equal `kind == ResolvableText`. Report pooled set accuracy as intersection / union, precision/recall/F1, and exact-case accuracy. An unmatched gold tuple is a false negative, an unmatched predicted tuple is a false positive, and wrong replacement text has an empty intersection. |
| Typo/variant preservation | Exact source-equals-replacement rate on `DE-PRESERVE-*`; must preserve `nähmlich`, `garnicht`, `Delphin`, `aufwändig`, and `aufwendig` byte-for-byte. |
| Conservative reconstruction | Exact replacement rate on `RECON-*`, plus the false-reconstruction rate on all other accepted cases, where a false reconstruction is any `replacement != source`. `RECON-03` additionally asserts atoms `braw`, `u`, `r`, `him`, `frfr` and forbids `you` or `are`. |
| Local opaque preservation | Exact `OpaqueText` span-and-text F1 on `MIXED-*`; the surrounding useful material must remain accepted and clickable. |
| Hebrew fused-atom accuracy | Exact sentence accuracy on `HE-FUSED-*`; adjacent `R` entries must remain separately indexed despite no orthographic separator. |

### Domain validity gates

These are application-boundary conformance checks, not model-format scores.
Every prompt arm must pass all of them:

- every accepted result has one nonempty `SegmentedSentenceId`;
- reading the same persisted result repeatedly returns the same ID and Segment
  sequence;
- a correction or re-segmentation creates a new ID rather than mutating the old
  result;
- Segment indices are exactly `0..length-1` in array order;
- no Segment carries a global ID;
- every Segment is nonempty and has exactly one of the four allowed kinds;
- click requests are accepted exactly at `ResolvableText` indices;
- rejected intake decisions do not create a Segmented Sentence;
- no source-alignment payload crosses the canonical application boundary.

Any gate failure disqualifies an arm regardless of its average quality.

### Operational measures

Run every arm against the same pinned model snapshot, provider, model
parameters, runner version, region, and concurrency (`1`). Keep the 28 gold
cases eval-only: neither an item nor a close paraphrase may appear in few-shot
examples. Run three repetitions per case in a seeded shuffled order and retain
every raw response and adapter error.

Report:

- serialized prompt bytes and provider-reported input, cached-input, output,
  reasoning, and total tokens per case and in total;
- serialized canonical-result bytes and Segment count per accepted result;
- end-to-end wall-clock latency per request as p50, p95, maximum, and arithmetic
  mean; if streaming, additionally report time to first output event;
- adapter failures, retries, and provider errors separately rather than
  silently retrying them out of the denominator;
- billed model cost per case, per 1,000 cases, and for the full run using the
  provider price schedule identifier and effective date captured with the run.

Provider-reported per-response token fields are the auditable basis for size
and model-cost calculation; the response and usage APIs expose input and output
token totals, including cached and reasoning breakdowns where applicable
([OpenAI Responses API][openai-response], [OpenAI usage API][openai-usage],
[OpenAI batch usage][openai-batch]). Do not bake a mutable price into this
corpus version.

## Comparison and acceptance rule

Do not collapse the measures into an arbitrary weighted score.

1. Disqualify any arm that fails a domain validity gate, changes an ordinary
   typo/variant, expands `u r`, reconstructs an ineligible case, or loses local
   `OpaqueText`.
2. Among eligible arms, compare the vector in this order:
   exact Segmented Sentence accuracy, Intake Decision accuracy,
   boundary-and-kind F1, click F1, and the minimum per-class exact accuracy.
3. A lower-quality arm cannot win on cost or latency. For arms tied on the
   complete quality vector, prefer lower billed cost, then lower p95 latency,
   then fewer output tokens.
4. If arms trade quality measures rather than dominate or tie, report the
   trade-off and do not select a production strategy without an explicit
   product decision.

The minimum acceptable experiment has perfect domain-gate, preservation,
reconstruction-guardrail, local-opaque, and required-atom checks. The remaining
quality vector is comparative evidence for issue #4, not a claim that one
aggregate percentage proves production readiness.

## Versioning

Call this corpus `segmentation-chain-v1`. Freeze the source strings, supported
inventory, gold decisions, replacement strings, Segment arrays, scoring code,
Unicode 17.0.0 boundary data, and runner configuration with each experiment.
Any gold correction increments the corpus version and requires rerunning all
compared arms. Add future cases as a new hidden or versioned evaluation set; do
not tune a prompt against mistakes observed on this fixed eval corpus and then
report the same run as unbiased evidence.

[context]: https://github.com/clockblocker/texteater/blob/main/battery/dumgen/CONTEXT.md
[issue-3]: https://github.com/clockblocker/texteater/issues/3
[uax-29]: https://www.unicode.org/reports/tr29/tr29-47.html
[ud-tokenization]: https://universaldependencies.org/u/overview/tokenization.html
[ud-hebrew]: https://universaldependencies.org/he/
[de-rules]: https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf
[conll-eval]: https://universaldependencies.org/conll18/evaluation.html
[openai-response]: https://developers.openai.com/api/reference/resources/responses/methods/create
[openai-usage]: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage
[openai-batch]: https://developers.openai.com/api/reference/resources/batches
