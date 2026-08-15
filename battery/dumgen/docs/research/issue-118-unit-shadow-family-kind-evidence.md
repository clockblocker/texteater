# Issue 118: evidence rules for Unit Shadow Family and Kind

Date: 2026-08-15

## Finding

`Family + Kind` is defensible for a Unit Shadow only when the proposed target
contains enough semantic or grammatical evidence to choose one Dumling route.
The spelling of the Canonical Form is not sufficient. The accepted corpus must
therefore score an explicit abstention outcome as correct whenever the input is
ambiguous, is a free phrase, or names a schema route for which no operational
classification can be sourced. A forced four-field output would make the
decision rule in issue #118 unsound even if it scored perfectly on a curated
set of unambiguous positives.

This follows directly from the repository model and the external evidence:

- Dumling defines Lemma identity using language, Canonical Form, Family, Kind,
  **and Core Features**; a Unit Shadow intentionally omits the last of these.
  It is a grammatical sketch, not a resolved Lemma or Reading. See
  [`battery/dumling/CONTEXT.md`](../../../dumling/CONTEXT.md) and
  [`battery/dumrel/CONTEXT.md`](../../../dumrel/CONTEXT.md).
- The concrete Dumling registry supports `de`, `en`, and `he`. Every language
  has all 17 Universal Dependencies (UD) part-of-speech Kinds, all eleven
  Morpheme Kinds, and both Construction Kinds; only German additionally has
  `Phraseme/Collocation`. See the
  [German](../../../dumling/src/schemas/concrete-language/features/de/de-subtree.ts),
  [English](../../../dumling/src/schemas/concrete-language/features/en/en-subtree.ts),
  and
  [Hebrew](../../../dumling/src/schemas/concrete-language/features/he/he-subtree.ts)
  schema trees.
- UD defines the same 17 tags as core word categories, but its annotation unit
  is the syntactic word. It explicitly does not segment words into morphemes
  and does not collapse multiword expressions into one word. Thus UD is a
  strong oracle for `Lexeme/<UPOS>` in context, but it cannot by itself choose
  Dumling's Family or any Morpheme Kind. [UD Universal POS
  inventory](https://universaldependencies.org/u/pos/), [UD tokenization and
  word segmentation](https://universaldependencies.org/u/overview/tokenization.html).

The broad schema inventory is consequently an admissibility boundary, not
evidence that every route is instantiated in every language. In particular,
the presence of German or English `ToneMarking` and `Transfix` schemas is not a
license to invent positive examples.

## Source-backed oracle cases

The following cases are suitable anchors for an adversarial canonical corpus.
“Input evidence” means evidence the classifier must actually receive (for
example, a target gloss or relation description); it must not be supplied only
to the corpus author.

| Language and proposed Canonical Form | Required input evidence | Ideal Family / Kind | Why the oracle is defensible | Nearest adversarial contrast |
| --- | --- | --- | --- | --- |
| de `während` | “during” followed semantically by a nominal time span | `Lexeme/ADP` | German GSD annotates the lemma `während` as `ADP` when it governs a nominal; UD defines an adposition as linking a nominal to its head. [GSD row](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L12948), [UD ADP](https://universaldependencies.org/u/pos/ADP.html) | The same spelling meaning “while” with a clause is `Lexeme/SCONJ`. |
| de `während` | “while” introducing a subordinate proposition | `Lexeme/SCONJ` | GSD annotates the same lemma as `SCONJ` before a clause; UD defines `SCONJ` by its clause-linking function. [GSD row and context](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L29174-L29180), [UD SCONJ](https://universaldependencies.org/u/pos/SCONJ.html) | A bare `während`, or “during/while” without complement type, must abstain. |
| en `that` | demonstrative replacing an NP (“that is okay”) | `Lexeme/PRON` | EWT annotates this use as `PRON`; UD defines pronouns as substituting for nouns or NPs. [EWT row](https://github.com/UniversalDependencies/UD_English-EWT/blob/4a4d77f599ea53cc405f85d0cec4b2f14f81d42b/en_ewt-ud-train.conllu#L1680), [UD PRON](https://universaldependencies.org/u/pos/PRON.html) | A noun-modifying demonstrative is `DET`; a complementizer is `SCONJ`. |
| en `that` | demonstrative modifying a noun (“that soldier”) | `Lexeme/DET` | EWT annotates this use as `DET`; UD defines determiners by nominal modification. [EWT row and context](https://github.com/UniversalDependencies/UD_English-EWT/blob/4a4d77f599ea53cc405f85d0cec4b2f14f81d42b/en_ewt-ud-train.conllu#L1868-L1870), [UD DET](https://universaldependencies.org/u/pos/DET.html) | Bare `that` must not default to the statistically common Kind. |
| en `that` | marker introducing a complement clause | `Lexeme/SCONJ` | EWT annotates this use as `SCONJ`; the UD `SCONJ` specification gives English complementizer *that* as a defining example. [EWT row](https://github.com/UniversalDependencies/UD_English-EWT/blob/4a4d77f599ea53cc405f85d0cec4b2f14f81d42b/en_ewt-ud-train.conllu#L63), [UD SCONJ](https://universaldependencies.org/u/pos/SCONJ.html) | The same target text has at least two other defensible Kinds. |
| en `to` | infinitive marker (“to come”) | `Lexeme/PART` | EWT annotates infinitival `to` as `PART`. UD requires `PART` to be used restrictively for a function word not satisfying another POS definition. [EWT row](https://github.com/UniversalDependencies/UD_English-EWT/blob/4a4d77f599ea53cc405f85d0cec4b2f14f81d42b/en_ewt-ud-train.conllu#L51), [UD PART](https://universaldependencies.org/u/pos/PART.html) | Directional/relational `to` before a nominal is `Lexeme/ADP` ([EWT row](https://github.com/UniversalDependencies/UD_English-EWT/blob/4a4d77f599ea53cc405f85d0cec4b2f14f81d42b/en_ewt-ud-train.conllu#L103)). |
| he `יש` | existential predicate (“there is”) | `Lexeme/VERB` | Hebrew HTB annotates existential `יש` as `VERB` with `HebExistential=Yes`. [HTB row](https://github.com/UniversalDependencies/UD_Hebrew-HTB/blob/dd6d2133e6b9373e7e4888a1b33724df38e2e549/he_htb-ud-train.conllu#L3267) | HTB also annotates modal uses of the same form and lemma as `ADV` ([row](https://github.com/UniversalDependencies/UD_Hebrew-HTB/blob/dd6d2133e6b9373e7e4888a1b33724df38e2e549/he_htb-ud-train.conllu#L5486)); underspecified input must abstain. |
| he `את` | definite direct-object marker | `Lexeme/ADP` | HTB annotates the unpointed form as `ADP`, `Case=Acc`. [HTB row](https://github.com/UniversalDependencies/UD_Hebrew-HTB/blob/dd6d2133e6b9373e7e4888a1b33724df38e2e549/he_htb-ud-train.conllu#L123) | The identical unpointed form can realize second-person feminine `PRON` ([HTB row](https://github.com/UniversalDependencies/UD_Hebrew-HTB/blob/dd6d2133e6b9373e7e4888a1b33724df38e2e549/he_htb-ud-train.conllu#L92369)); HTB's pronoun lemma is `הוא`, so the corpus must first freeze Dumling's Canonical Form rather than copying the surface blindly. |
| en `reveal` | make previously secret information known | `Lexeme/VERB` | Cambridge labels *reveal* a verb and defines this reading in terms of making secret information known. [Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/reveal) | Its relation counterpart `spill the beans` is a phrase, not a `Lexeme/VERB`. |
| en `spill the beans` | disclose secret information | `Phraseme/Idiom` | Cambridge labels the exact expression “idiom” and defines the same secret-disclosure reading. This is the required lexical-synonym/phrase-counterpart contrast with `reveal`. [Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/spill-the-beans) | Do not classify every verb phrase as an Idiom; UD keeps ordinary multiword expressions as several syntactic words. |
| en `no worries` | friendly reassurance or response to thanks/apology | `Phraseme/DiscourseFormula` | Cambridge records the expression as a phrase and describes its communicative uses (“telling someone not to be concerned” and a friendly answer). Mapping that source fact to `DiscourseFormula` follows Dumling's communicative-role definition. [Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/no-worries) | With no conventional communicative role, a compositional NP such as `no errors` is not a Phraseme. |
| de `eine Entscheidung treffen` | conventional literal predicate “make a decision” | `Phraseme/Collocation` | Duden records the exact restricted combinations `eine Entscheidung treffen/fällen/herbeiführen`; IDS defines a function-verb construction as a verb plus nominal or prepositional group functioning as one predicate and warns that its boundary with a full verb plus object is gradual. Dumling's own Collocation definition supplies the final product mapping: restricted lexical choice with non-idiomatic overall meaning. [Duden](https://www.duden.de/rechtschreibung/Entscheidung), [IDS Grammis](https://grammis.ids-mannheim.de/vggf/2202) | English and Hebrew schemas do not admit `Collocation`; a multilingual prompt must not hallucinate the German-only Kind. |
| de `Morgenstund hat Gold im Mund` | conventional maxim about the value of early rising | `Phraseme/Proverb` | An IDS study explicitly treats the expression as a proverb. [IDS publication](https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/13187/file/Hein_Zugang_zur_Sprichwortbedeutung_2012.pdf) | Duden groups “Wendungen, Redensarten, Sprichwörter” together on many pages, so that heading alone is not a Kind-level oracle. |
| de `un-` | negative/reversative bound element, not the organization `UN` | `Morpheme/Prefix` | Duden gives the exact headword `un-` and labels its word class `Präfix`. [Duden](https://www.duden.de/rechtschreibung/un_) | Case and hyphen matter: `UN` is not this Morpheme, and `un` without evidence is not enough to repair silently. |
| en `-ness` | bound nominalizer added after an adjective | `Morpheme/Suffix` | Cambridge labels `-ness` a suffix and defines its noun-forming function. [Cambridge Dictionary](https://dictionary.cambridge.org/dictionary/english/ness) | The standalone proper name `Ness` must not be routed by character shape. |
| he `כ־ת־ב` | the consonantal lexical root underlying forms such as *katav* | `Morpheme/Root` | The UD Hebrew `HebBinyan` specification describes Hebrew templates by interspersing vowels with the root consonants and illustrates the root with *katav*, *niktav*, and related forms. [UD Hebrew `HebBinyan`](https://universaldependencies.org/he/feat/HebBinyan.html) | The same source supports the existence of an interleaved template, but it does not call that template a Dumling `Transfix`; that Kind needs an explicit product definition before it can be an exact oracle. |
| de `zum` | fused `zu + dem` | `Construction/Fusion` | IDS records the fusion directly; German GSD independently represents `zum` as one orthographic multiword token expanded into `zu` (`ADP`) and `dem` (`DET`). The external facts establish fusion, while the final `Construction/Fusion` projection is Dumling policy. [IDS Grammis](https://grammis.ids-mannheim.de/praepositionen/299700), [GSD token](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L117-L119) | `zu` alone may be `Lexeme/ADP` or `Lexeme/PART`; the fused spelling must not be reduced to one of its components. |
| de `je … desto/umso` | both arms of the proportional correlation | `Construction/PairedFrame` | IDS describes the construction as an obligatorily two-part proportional correlation. [IDS Grammis](https://grammis.ids-mannheim.de/systematische-grammatik/2118) | `je` or `desto` in isolation is insufficient evidence for the Construction. |

UD's `fixed` relation is useful negative evidence rather than a direct Phraseme
classifier. It is intentionally restricted to highly grammaticalized,
internally unmodifiable expressions and even recommends language-specific
closed lists. Flexible idioms, collocations, discourse formulae, and proverbs
therefore require dictionary, grammar, or expression-level evidence instead of
being inferred from a UD dependency label. [UD `fixed`](https://universaldependencies.org/u/dep/fixed.html).

## Required abstention cases

The ideal output should carry no guessed Family or Kind for each of these:

1. Bare ambiguous forms: de `während`, en `that` or `to`, he `יש` or `את`
   without the distinguishing semantic/syntactic evidence shown above.
2. A compositional free phrase such as en `very old house`. Whitespace does not
   prove `Phraseme`; UD explicitly treats MWEs separately from syntactic-word
   tokenization.
3. A plausible but unattested or malformed relation target when neither a
   dictionary entry nor supplied meaning makes one route defensible. Do not
   use `Lexeme/X` as a confidence bucket: UD reserves `X` for unintelligible
   material, fragments, and unanalyzed foreign words, and discourages it when
   a real category is available. [UD `X`](https://universaldependencies.org/u/pos/X.html).
4. A Morpheme Kind inferred only because it exists in the schema, such as an
   English `ToneMarking` or German `Transfix` without language-specific
   evidence.
5. A Phraseme Kind not admitted by that language's Dumling tree, especially
   `Collocation` for English or Hebrew.
6. A target whose evidence establishes a broad linguistic phenomenon but not
   Dumling's exact subtype—for example a Hebrew root-vowel template proposed
   as `Transfix`, or a contraction proposed as `Fusion` before the product
   mapping is frozen.

Abstention must be distinct from invalid schema output. It is a successful
classification decision that says exact grammar cannot be defended from the
available target evidence.

## Corpus and evaluator acceptance rules

1. Build one representation-neutral Canonical Classification Corpus, following
   Dumgen ADR 0002. The oracle output should be either `{ family, kind }` or an
   explicit `Unresolved`; representation adapters must not alter that semantic
   decision.
2. Cover every language and every **applicable, source-backed** Family/Kind.
   For each positive route, include at least one closest-boundary negative.
   Record intentional absence where a schema route is typologically or
   operationally unsupported; never fill the grid with synthetic positives.
3. Include complete ambiguity sets as one contamination group: all three
   English `that` Kinds, both `to` Kinds, both German `während` Kinds, and the
   Hebrew pairs above. No member of a set may cross from demonstrations into
   evaluation.
4. Include same-text/different-Kind pairs, same-meaning/different-Family pairs
   (`reveal` / `spill the beans`), free-phrase/Phraseme pairs, and
   bound-morpheme/Lexeme lookalikes. Score Family and Kind separately as well as
   jointly.
5. The model input may contain the source Reading's semantic relation context
   and a target gloss, but the output and evaluator must forbid Lemma creation,
   Core Features, Emoji Description, Reading identity, Knowledge generation,
   and recursive target resolution. Tests should fail any response containing
   those deferred fields even when Family and Kind are correct.
6. A “perfect score” means exact decisions on every accepted positive **and**
   every abstention case in an untouched selection. If the model-facing
   contract cannot represent abstention, issue #118's decision rule requires
   revising the Unit Shadow descriptor contract before making `Family + Kind`
   mandatory.

## Source quality boundary

The cited UD specifications, pinned UD treebank annotations, IDS Grammis and
IDS publications, Duden entries, and Cambridge Dictionary entries are the
primary specifications, datasets, grammars, or first-party dictionaries that
own the relevant claims. Where a source establishes only an observable fact
and Dumling supplies the final taxonomy mapping, the table labels that mapping
explicitly; it does not present internal Family/Kind names as if an external
authority had coined them.
