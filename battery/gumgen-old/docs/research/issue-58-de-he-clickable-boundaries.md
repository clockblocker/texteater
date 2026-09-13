# DE/HE learner-clickable boundary research

Status: fact-finding for [texteater#58](https://github.com/clockblocker/texteater/issues/58), not product policy.

## Scope and method

This note investigates where German and Hebrew text can be divided and what
available tools actually return. It does **not** select the learner-facing
boundary policy reserved for
[texteater#70](https://github.com/clockblocker/texteater/issues/70), prescribe an
implementation, or treat inherited Segmentation code as evidence.

The repository's product input is the human-owned vision's “smallest clickable
units” that can independently point toward Dumling's biggest applicable unit.
The current domain context adds structural constraints: every Segment is a
non-empty contiguous part of the authoritative text; ordered Segments are a
lossless partition; only `ResolvableText` is clickable; uncertain or foreign
local material may be `OpaqueText`. These are product constraints, not
linguistic claims.

External claims below come only from specifications, official project
documentation/source, language authorities, and papers by tool authors. Runtime
observations are labeled and are not generalized into guarantees.

## Findings

1. There is no single factual “word boundary” that answers the product
   question. Unicode word boundaries serve search/selection; UD annotates
   syntactic words; analyzers predict their training scheme's units; the vision
   asks for visible learner-click targets.
   [UAX #29](https://www.unicode.org/reports/tr29/),
   [UD tokenization](https://universaldependencies.org/u/overview/tokenization.html)
2. Extended grapheme clusters are the common lower-level substrate. Unicode
   prevents boundaries inside combining sequences and emoji ZWJ sequences.
   That protects Hebrew niqqud and emoji but says nothing about clickability.
   [UAX #29](https://www.unicode.org/reports/tr29/),
   [UTS #51](https://www.unicode.org/reports/tr51/)
3. German has at least four incompatible layers: Unicode/`Intl` spans, German
   orthographic words, UD syntactic words, and learner clicks. Closed/hyphenated
   compounds, apostrophe forms, and preposition–article contractions force the
   differences.
4. Hebrew orthographic words can contain many UD syntactic words. UD separates
   proclitics and suffixal clitics and may represent a covert article, but some
   expanded words are reconstructed analyses rather than source substrings.
   [UD Hebrew](https://universaldependencies.org/he/),
   [CoNLL-U](https://universaldependencies.org/format.html)
5. `Intl.Segmenter` is a useful lossless boundary generator, not a semantic or
   morphological oracle. ECMA-402 makes boundary determination and
   `isWordLike` implementation-dependent and only recommends UAX #29/CLDR.
   [ECMA-402 `FindBoundary`](https://tc39.es/ecma402/2025/#sec-findboundary),
   [segment data](https://tc39.es/ecma402/2025/#sec-createsegmentdataobject)
6. Stanza, SoMaJo, SMOR, HebPipe/RFTokenizer, DictaBERT, and YAP provide useful
   candidate evidence, but none emits the product's `ResolvableText` versus
   `OpaqueText` judgment or promises that a click can resolve to Dumling.

## Boundary taxonomy

The last column is deliberately an unresolved question.

### German

| Phenomenon                      | Source-backed fact                                                                                                                                                                                                      | Fresh adversarial form                                                            | Product-policy gap                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Orthographic word               | German UD generally delimits words by whitespace.                                                                                                                                                                       | `Die Katze schläft.`                                                              | Is each ordinary word one click, subject to an opaque test?                                                      |
| Closed compound                 | UD does not split written German compounds. IDS defines compounds as new words built from at least two words/stems; constituents and semantically empty linking elements can occur.                                     | `Krankenhaus`; `Staubecken`; `Donaudampfschifffahrt`                              | Whole word, visible constituents, or high-level whole plus drill-down; how are ambiguous parses/linkers handled? |
| Hyphenated / suspended compound | Official §81 says a hyphen interrupts _within a word_ and preserves whole-word status; it can expose compound structure.                                                                                                | `E-Mail-Adresse`; `7-Bit-Code`; `Arbeits- und Sozialrecht`; `Aus-der-Haut-Fahren` | One click, components, or role-specific behavior; who owns suspended/implicit material and hyphens?              |
| Preposition–article contraction | German UD's sole MWT class is contractions such as `zum = zu + dem`. IDS lists `am`, `beim`, `im`, `vom`, `zum`, `zur`, `ans`, `ins`, `aufs` and further spoken/written variants. Expansions are not two literal spans. | `im Haus`; `übers Ohr`; `auf’m Berg`                                              | Visible fusion as one click, synthetic subclicks, or drill-down?                                                 |
| Apostrophe                      | Official §80 uses apostrophe for Genitive/morpheme boundaries, omitted letters, fusions, and names.                                                                                                                     | `Machen Sie’s`; `auf’m`; `Hannes’`; `’n Abend`; `D’dorf`                          | Internal punctuation or boundary; which productive fusions expose a click?                                       |
| Abbreviation                    | UD keeps `usw.` whole. Official §82 includes multi-part `z. B.` and single-word `Nr.`/`usw.`.                                                                                                                           | `z. B.`; `usw.`; `Dr.`; `Abt.-Leiter`                                             | May one unit span whitespace; which period is internal or sentence-final?                                        |
| Separable verb / larger target  | The same lexeme may surface together or apart; UD links a separated particle with `compound:prt`.                                                                                                                       | `schlägt ... auf` / `aufschlägt`; ambiguous `umfahren`                            | Keep small surface clicks and group later, or let segmentation encode lexical unity?                             |
| Number-like form                | UAX keeps many digit/letter/decimal sequences; SoMaJo has distinct rules for times, ordinals, fractions, dates, and measures.                                                                                           | `3,14`; `12.08.2026`; `17-Jährige`; `100%ig`                                      | Which whole forms click, and are units/currency/punctuation internal?                                            |
| URL/social form                 | SoMaJo explicitly recognizes URLs, email, emoticons, handles, and hashtags. UAX/`Intl` is not a full entity tokenizer.                                                                                                  | `https://example.de/a?q=1.`; `foo+tag@example.de`; `#Deutsch`                     | Whole click, opaque entity, or interior lexical pieces; detach trailing punctuation?                             |
| Emoji / emoticon                | Unicode keeps emoji ZWJ sequences atomic; SoMaJo recognizes emoticons. Word-likeness is separate.                                                                                                                       | `👩‍❤️‍👩`; `🇩🇪`; `👍🏽`; `:-)`                                                           | Resolvable, opaque, or structural; one grapheme or a larger run?                                                 |
| Typo / blown-off/noisy form     | Token boundaries do not establish resolvability or prove a prior stitching decision.                                                                                                                                    | `sooo guuut`; `Kran ken haus`; `kannste nich`; `D…!`; `awfwtgfs`                  | When clickable versus opaque; may Segmentation repair/cross remaining spaces?                                    |
| Mixed script                    | UAX does not normally break solely at a script change.                                                                                                                                                                  | `Deutschשלום`; `Berlin2026`                                                       | Force script boundaries, preserve identifiers, or mark a local span opaque?                                      |

German facts use the official
[2024 spelling rules](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf)
(compound/hyphen §§37, 40–45, 81; apostrophe §80; abbreviation §82),
[IDS compound terminology](https://grammis.ids-mannheim.de/terminologie/128),
[IDS compound constituents](https://grammis.ids-mannheim.de/terminologie/84),
[IDS linking elements](https://grammis.ids-mannheim.de/fragen/3166),
[IDS contractions](https://grammis.ids-mannheim.de/kontrastive-grammatik/3813),
and [UD German](https://universaldependencies.org/de/). These establish
orthographic/morphosyntactic structure, not clickability.

### Hebrew

| Phenomenon                  | Source-backed fact                                                                                                                                                             | Fresh adversarial form                                    | Product-policy gap                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Orthographic supertoken     | Whitespace generally delimits raw tokens but not their syntactic words.                                                                                                        | `הילד בבית`                                               | Is a supertoken an analysis envelope or sometimes the final click?                                                |
| Proclitic                   | Hebrew UD separates ב/ל/כ/מ, conjunction ו, article ה, subordinator ש, and combinations. Splitting is contextual, not “split every matching first letter.”                     | `והחל`; `וכשהגעתי`; `ובבית`                               | Each function, a visible prefix bundle, or prefix+host; how is lexical-initial oversplitting prevented?           |
| Fused preposition + article | `בבית` can analyze as `ב + בית` (“at a house”) or `ב + ה + בית` (“in the house”); after ב/ל the article can be covert.                                                         | `בבית`; pointed `בַּבַּיִת`                               | May the visible prefix point to a fusion; are zero-width/covert clicks forbidden; can context alter the boundary? |
| Pronominal suffix / object  | UD expands `שלנו → של_ + _אנחנו`, `אהבתיה → אהבתי_ + _את_ + _היא`, and possessive `ספרו → ספר_ + _של_ + _הוא`. These insert/normalize absent material.                         | `שלנו`; `אהבתיה`; `לימודיו`; ambiguous `ספרו` / `סָפְרוּ` | Is a surface suffix clickable; may one surface suffix point to several units; or is this drill-down only?         |
| Niqqud / cantillation       | Unicode treats combining marks as extensions and has no default boundary inside their combining sequence.                                                                      | `שָׁלוֹם`; `בַּבַּיִת`                                    | Hard grapheme invariant; can pointed and unpointed forms choose different higher boundaries?                      |
| Maqaf / hyphen              | Hebrew Academy §32 says maqaf can mark a close connection and is optional in several uses. UD separates punctuation even in `בין-משרדית`; UAX normally breaks around the mark. | `בית־ספר`; `יום־יום`; `בין-משרדית`                        | Whole compound or components; which mark becomes `Punctuation`?                                                   |
| Abbreviation / geresh       | UD keeps `צה״ל` whole. UAX has Hebrew quote rules; Hebrew Academy §§30–31 put gershayim before an initialism's last letter.                                                    | `צה״ל`; `צה"ל`; `ח"כ`; `ג׳ון`                             | Which canonical/legacy marks are internal; how are malformed/quote uses distinguished?                            |
| Mixed alphanumeric          | UAX's `AHLetter` unites Hebrew and other alphabetic letters; letters/digits can stay one span.                                                                                 | `abcאבג123`; `ב־DNA`                                      | Split scripts, preserve brand/identifier, or mark foreign subspan opaque?                                         |
| URL/social form             | UAX is not entity recognition; Hebrew analyzers focus on whitespace/morphology.                                                                                                | `https://example.org/שלום?q=בית.`; `#שלום`                | Whole entity, opaque, or interior pieces; bidi-safe trailing punctuation?                                         |
| Emoji / symbol              | Grapheme atomicity does not imply word-likeness or grammatical resolution.                                                                                                     | `👨‍👩‍👧‍👦`; `❤️`; `₪50`                                         | Clickability, grouping, currency attachment?                                                                      |
| Typo / spacing noise        | Learned segmenters report corpus scores below 100%, not guarantees on arbitrary malformed text.                                                                                | `שלוווום`; `ו הבית`; `ב י ת`                              | Confidence/abstention and opaque fallback; which repair belongs only to Intake?                                   |

Hebrew punctuation facts come from the
[Academy rules](https://hebrew-academy.org.il/topic/hahlatot/punctuation/).
Syntactic-word facts come from [UD Hebrew](https://universaldependencies.org/he/).
The sources describe different layers and are not in conflict.

## The exact linguistic-tokenization gap

| Layer                   | Answers                                        | Can contain/invent non-source material?    | Answers clickability?      |
| ----------------------- | ---------------------------------------------- | ------------------------------------------ | -------------------------- |
| Extended grapheme       | Encoded user-perceived character cluster       | No                                         | No                         |
| UAX/`Intl` word span    | Search/cursor/locale boundary                  | No; source substrings                      | No                         |
| Orthographic token      | Written unit around space/punctuation          | No                                         | No                         |
| UD token                | Surface token envelope                         | Normally source-aligned                    | No                         |
| UD word / MWT expansion | Morphology/dependency node                     | Yes; normalized, covert, reconstructed     | No                         |
| Analyzer subtoken       | Unit for one model/corpus/scheme               | Sometimes lacks authoritative source spans | No                         |
| Dumgen Segment          | Non-empty contiguous lossless partition member | No                                         | Yes, only `ResolvableText` |

Consequences (inferences from the cited facts and repository contract):

- `im → in + dem` and `ספרו → ספר + של + הוא` are grammatical analyses, not
  ready-made clickable partitions.
- A covert article cannot be a non-empty Segment. #70 must choose a visible
  projection, keep the host whole, or defer the analysis.
- `isWordLike`, POS, or MWT prediction is candidate evidence, never proof of
  `ResolvableText`.
- Separable verbs and phrasemes demonstrate that boundary detection and later
  multi-Segment target grouping must remain distinct concepts.

## Tool-capability matrix

| Candidate             | What it provides                                                                                                                   | Useful evidence                                                                                        | Contract gap / risk                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UAX #29               | Normative default/profile grapheme, word, sentence rules; tailoring allowed.                                                       | Grapheme safety, property data, Hebrew quote behavior, deterministic baseline.                         | No morphology, entities, language confidence, resolvability, or click policy; default hyphen/script behavior may disagree.                                          |
| `Intl.Segmenter`      | Locale/options API returning substrings, UTF-16 indices, implementation-dependent `isWordLike`.                                    | Lightweight lossless DE/HE candidate spans and grapheme mode.                                          | Engine/data-version variation; no compounds/clitics; fragments URLs; emoji can be non-word-like.                                                                    |
| UD                    | Standard separating surface tokens, syntactic words, MWTs.                                                                         | Explicit DE contractions and HE clitic analyses; corpora.                                              | Not a runtime; treebank choices differ; words can be non-source text; syntax is not clickability.                                                                   |
| Stanza                | Neural raw `TokenizeProcessor`; separate MWT expansion; surface Token offsets; DE/HE models.                                       | Contextual token/MWT candidates.                                                                       | Expanded `Word.text` need not occur in raw input; model/data/version dependent; no opaque/eligibility decision.                                                     |
| SoMaJo `de_CMC`       | Rule-based German web/social tokenizer; token classes, whitespace metadata, offsets, URL/email/emoticon/abbreviation/number rules. | Strong German entity/noise baseline and transparent rules.                                             | EmpiriST contract, not this policy. Optional preprocessing normalizes/removes characters and must not violate losslessness; CamelCase/punctuation are tool choices. |
| SMOR                  | Finite-state German inflection, derivation, and compound analyses.                                                                 | Candidate compound/morpheme analyses and explicit ambiguity.                                           | Not contextual selection or learner offsets; many analyses; research/evaluation license constraints.                                                                |
| HebPipe / RFTokenizer | Plain-text Hebrew whitespace + internal morphological segmentation; reconstructible/aligned output and pipe workflow.              | Source-aligned Hebrew candidate splits. README reports end-to-end word F1 99.11 HTB / 99.33 IAHLTwiki. | Empirical scores, scheme/domain/model dependence; morphology does not decide clickability/opacity.                                                                  |
| DictaBERT-seg / joint | Contextual Hebrew prefix segmentation; joint morphology/lemma/deps/NER.                                                            | Modern contextual alternative; exposes scheme choices.                                                 | Prefix model omits suffix splitting. Joint model documents different HTB/IAHLT suffix and implicit-article outputs; reconstructed units need alignment.             |
| YAP                   | Hebrew analysis lattice, contextual disambiguation, dependency parse over pretokenized input.                                      | Competing analyses for ambiguous forms.                                                                | Caller owns initial tokenization; normalized lattice needs span adapter; heavyweight/data-license constraints; no learner policy.                                   |

Sources:
[Stanza tokenizer](https://stanfordnlp.github.io/stanza/tokenize.html),
[getting started](https://stanfordnlp.github.io/stanza/getting_started.html),
[data objects](https://stanfordnlp.github.io/stanza/data_objects.html),
[performance](https://stanfordnlp.github.io/stanza/performance.html),
[1.11 release](https://github.com/stanfordnlp/stanza/releases/tag/v1.11.0),
[SoMaJo](https://github.com/tsproisl/SoMaJo),
[SoMaJo paper](https://aclanthology.org/W16-2607/),
[SMOR](https://www.cis.uni-muenchen.de/~schmid/tools/SMOR/),
[SMOR paper](https://www.cis.uni-muenchen.de/~schmid/papers/HLT-EMNLP05.pdf),
[HebPipe](https://github.com/amir-zeldes/HebPipe),
[RFTokenizer](https://github.com/amir-zeldes/RFTokenizer),
[RFTokenizer paper](https://aclanthology.org/W18-5811/),
[DictaBERT-seg](https://huggingface.co/dicta-il/dictabert-seg),
[paper](https://arxiv.org/abs/2308.16687),
[joint model card](https://huggingface.co/dicta-il/dictabert-joint/blob/main/README.md),
[YAP](https://github.com/OnlpLab/yap).

### `Intl.Segmenter` observation, not a guarantee

Observed locally on Node `v25.2.1`, ICU `78.1`, Unicode `17.0`, CLDR `48.0`,
with word granularity:

| Input                                       | Observed spans                         | Gap exposed                              |
| ------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `Donaudampfschifffahrtsgesellschaft`, `zum` | each one word-like span                | No compound/contraction analysis         |
| `E-Mail`                                    | `E` + `-` + `Mail`                     | Breaks inside official whole word        |
| `z.B.`                                      | word-like `z.B` + non-word-like `.`    | Does not settle abbreviation punctuation |
| `www.beispiel.de/a-b?q=1`                   | domain + punctuation/interior pieces   | Not URL entity tokenization              |
| `בַּבַּיִת`, `ובבית`, `ספרו`                | each one word-like span                | No prefix/suffix analysis                |
| `בית־ספר`                                   | `בית` + `־` + `ספר`                    | Maqaf policy remains open                |
| `צה״ל`, `צה"ל`                              | each one word-like span                | Useful behavior but runtime-specific     |
| `שלוםworld`                                 | one word-like span                     | No script-change boundary                |
| ZWJ emoji + `!`                             | atomic emoji + `!`, both non-word-like | Atomicity is not clickability            |

Prototypes #62/#63 must rerun a frozen corpus against the deployed runtime.

## Fresh adversarial inventory

Bracketings are competing candidates, not expected outputs.

| ID    | Input                                                  | Choice exposed                                                                                                              |
| ----- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| DE-01 | `Häusern`                                              | whole inflected surface versus a morphological analysis that cannot be source-sliced without rewriting/splitting the umlaut |
| DE-02 | `Staubecken`; `Donaudampfschifffahrt`                  | whole compound versus ambiguous/productive constituents                                                                     |
| DE-03 | `E-Mail`; `7-Bit-Code`; `Auf-die-lange-Bank-Schieben`  | official whole word versus UAX pieces; hyphen ownership                                                                     |
| DE-04 | `Arbeits- und Sozialrecht`                             | suspended constituent and implicit distant material                                                                         |
| DE-05 | `im Haus`; `übers Ohr`; `auf’m Berg`                   | source token versus multiple virtual syntactic words                                                                        |
| DE-06 | `Sie’s`; `wenns`; `’n Abend`; `Hannes’`                | medial/absent/leading/trailing apostrophe behavior                                                                          |
| DE-07 | `schlägt ... auf` / `aufschlägt`; ambiguous `umfahren` | segmentation versus lexical/semantic target grouping                                                                        |
| DE-08 | `usw.`; `z. B.`; `Abt.-Leiter`                         | abbreviation point, whitespace, and hyphen interactions                                                                     |
| DE-09 | `3,14`; `17-Jährige`; `100%ig`                         | numbers, punctuation, derivation                                                                                            |
| DE-10 | URL/email/hashtag + final `.`                          | technical entity boundary and punctuation detachment                                                                        |
| DE-11 | `👩‍❤️‍👩 🇩🇪 👍🏽 :-)`                                         | grapheme safety versus word-likeness/clickability                                                                           |
| DE-12 | `Kran ken haus`; `D…!`; NFD `Café`                     | repair boundary, omitted fragment, normalization/offset invariant                                                           |
| HE-01 | `בבית`; `בַּבַּיִת`                                    | ambiguous/covert article; `[בַּ][בַּיִת]` versus whole; grapheme safety                                                     |
| HE-02 | `והחל`; `וכשהגעתי`                                     | oversplit guard and prefix-bundle granularity                                                                               |
| HE-03 | `שלנו אהבתיה לימודיו`                                  | visible suffix versus reconstructed syntactic words                                                                         |
| HE-04 | `ספרו` / `סָפְרוּ`                                     | unpointed noun+possessive/verb ambiguity versus niqqud                                                                      |
| HE-05 | `צה״ל צה"ל ג׳ון`                                       | canonical and legacy internal marks                                                                                         |
| HE-06 | `בית־ספר יום-יום בין-משרדית`                           | maqaf/ASCII hyphen, compound/repetition                                                                                     |
| HE-07 | `abcאבג123 ב־DNA`                                      | script/digit transitions and foreign acronym                                                                                |
| HE-08 | mixed-direction URL + final `.`                        | entity span, bidi display, trailing punctuation                                                                             |
| HE-09 | `״שלום?!״ 👨‍👩‍👧‍👦`                                          | quotes, punctuation run, ZWJ emoji                                                                                          |
| HE-10 | `ו הבית`; `ב י ת`; `שלוווום`                           | erroneous spacing, blown-apart form, expressive typo                                                                        |

## Exact decisions #70 must make

Research constrains but does not choose any branch.

### Normative level and cross-language forms

1. Define the observable “independent-pointer” test for a visible click.
2. Choose the high-level reading-view seam versus later morpheme drill-down.
3. Decide whether one visible span may point to a fusion/multiple grammatical
   units, and how covert/reconstructed words project into non-empty source spans.
4. Decide whether contextual/niqqud ambiguity may alter visible boundaries or
   only downstream resolution.
5. Require or reject a no-break-inside-extended-grapheme invariant and pin its
   Unicode version.
6. Enumerate punctuation as internal versus separate `Punctuation`, including
   run grouping, quotes, ellipsis, and coincident abbreviation/sentence marks.
7. Distinguish hyphen/minus/dash/non-breaking hyphen/German Divis/Hebrew maqaf
   roles and choose boundary/kind for each.
8. Decide German apostrophe uses and Hebrew geresh/gershayim/ASCII substitutes,
   including malformed and quote-like uses.
9. Decide decimals, grouping, signs, fractions, dates, times, ordinals,
   currencies, measures, and alphanumeric forms.
10. Decide whole/interior/opaque handling for URLs, email, handles, hashtags,
    filenames, identifiers, and trailing punctuation.
11. Decide emoji/symbol clickability and grouping independently of grapheme
    atomicity and `isWordLike`.
12. Decide script-change boundaries, mixed brands, and primary-language versus
    local `OpaqueText` classification.
13. Define `ResolvableText` evidence for misspellings, expressive spelling,
    accidental joins, unknown strings, and remaining blown-off fragments.
14. State whether Segmentation may ever repair/cross a space after Intake.

### German-specific

15. Closed compounds: whole, constituents, or high-level whole plus drill-down;
    specify productive, ambiguous, and linking-element cases.
16. Hyphenated/suspended compounds: one invariant or explicit differences for
    ordinary, phrase, coordinated, abbreviated, foreign, and line-wrap uses.
17. Preposition–article contractions: visible whole or another source-aligned
    projection of UD's virtual expansion.
18. Apostrophe fusions: clitic exposure for `Sie’s`, `auf’m`, informal forms,
    distinct from possessive/name punctuation.
19. Abbreviations: single/multi-part, internal spaces/periods, and final period.
20. Separable verbs/phrasemes: which member clicks may point toward a later
    multi-Segment target without changing the surface partition.

### Hebrew-specific

21. Proclitics: each function, visible prefix bundle, or whole supertoken, with
    combinations and lexical-initial oversplit guard.
22. Fused article: visible fused click, whole host, or deferred analysis;
    pointed/unpointed and covert behavior.
23. Suffixes: surface boundary and relation of one suffix to multiple
    reconstructed UD words.
24. Maqaf compounds/repetitions: whole versus components, mark kind, ASCII
    fallback.
25. Niqqud: exact preservation/order and whether it changes higher boundaries.
26. Abbreviation/transliteration marks: canonical/legacy forms and ambiguity.

### Deterministic guarantees handed to #62/#63

27. Give every accepted rule a stable ID and total precedence order.
28. Pin Unicode/CLDR/runtime plus every analyzer model, scheme/treebank, lexicon,
    and rule-set version affecting output.
29. Require non-empty contiguous source spans and exact concatenation; define an
    adapter for virtual analyzer words.
30. Choose preserve-whole, local opaque, deterministic fallback, or typed failure
    for ambiguity, out-of-domain/noisy input, and engine failure.
31. State whether learned inference is acceptable under fixed artifacts/hardware
    and what equivalence must hold across deployments.
32. Convert every accepted/rejected branch into exact DE/HE golden arrays,
    including normalization and bidi cases.
33. Define what evidence assigns `ResolvableText`/`OpaqueText`; boundary output
    alone cannot silently make the semantic assertion.
34. Set input, latency/dependency, offline/model, licensing, and observable
    fallback constraints.

## Complete URL inventory

- Product:
  [#58](https://github.com/clockblocker/texteater/issues/58),
  [#70](https://github.com/clockblocker/texteater/issues/70)
- Unicode/ECMAScript:
  [UAX #29](https://www.unicode.org/reports/tr29/),
  [UTS #51](https://www.unicode.org/reports/tr51/),
  [Word Break data](https://www.unicode.org/Public/UCD/latest/ucd/auxiliary/WordBreakProperty.txt),
  [ECMA-402 boundary](https://tc39.es/ecma402/2025/#sec-findboundary),
  [ECMA-402 segment data](https://tc39.es/ecma402/2025/#sec-createsegmentdataobject)
- Orthography/linguistics:
  [German rules](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf),
  [IDS compound](https://grammis.ids-mannheim.de/terminologie/128),
  [IDS constituents](https://grammis.ids-mannheim.de/terminologie/84),
  [IDS linkers](https://grammis.ids-mannheim.de/fragen/3166),
  [IDS contractions](https://grammis.ids-mannheim.de/kontrastive-grammatik/3813),
  [Hebrew Academy punctuation](https://hebrew-academy.org.il/topic/hahlatot/punctuation/),
  [UD tokenization](https://universaldependencies.org/u/overview/tokenization.html),
  [UD German](https://universaldependencies.org/de/),
  [UD German GSD data](https://github.com/UniversalDependencies/UD_German-GSD/blob/master/de_gsd-ud-train.conllu),
  [UD German particle](https://universaldependencies.org/treebanks/de_pud/de_pud-dep-compound-prt.html),
  [UD Hebrew](https://universaldependencies.org/he/),
  [CoNLL-U](https://universaldependencies.org/format.html)
- Tools:
  [Stanza tokenizer](https://stanfordnlp.github.io/stanza/tokenize.html),
  [Stanza getting started](https://stanfordnlp.github.io/stanza/getting_started.html),
  [Stanza data objects](https://stanfordnlp.github.io/stanza/data_objects.html),
  [Stanza performance](https://stanfordnlp.github.io/stanza/performance.html),
  [Stanza 1.11](https://github.com/stanfordnlp/stanza/releases/tag/v1.11.0),
  [SoMaJo](https://github.com/tsproisl/SoMaJo),
  [SoMaJo paper](https://aclanthology.org/W16-2607/),
  [SMOR](https://www.cis.uni-muenchen.de/~schmid/tools/SMOR/),
  [SMOR paper](https://www.cis.uni-muenchen.de/~schmid/papers/HLT-EMNLP05.pdf),
  [HebPipe](https://github.com/amir-zeldes/HebPipe),
  [RFTokenizer](https://github.com/amir-zeldes/RFTokenizer),
  [RFTokenizer paper](https://aclanthology.org/W18-5811/),
  [DictaBERT-seg](https://huggingface.co/dicta-il/dictabert-seg),
  [DictaBERT paper](https://arxiv.org/abs/2308.16687),
  [DictaBERT-joint](https://huggingface.co/dicta-il/dictabert-joint/blob/main/README.md),
  [YAP](https://github.com/OnlpLab/yap)
