# German Partizip I/II classification: policy space and pipeline consequences

Status: research note. Researched 2026-08-16; Policy C was subsequently
accepted and implemented by [ADR 0007](../../../../docs/adr/0007-use-the-tiger-boundary-for-german-participles.md).

## Decision in one sentence

German participles force three different questions apart:

1. **Morphological source:** is the form built from a verb?
2. **Lexical identity:** does this use belong to the verb lexeme, or has an adjective or noun lexeme been established?
3. **Contextual syntax:** is this occurrence functioning in a verbal complex, an adjective phrase, or a noun phrase?

No source surveyed makes one answer serve all three questions without exceptions. The pipeline currently makes `Lemma.kind` answer lexical identity and contextual part of speech at once. That is why a plausible verbal analysis of `sind` and a plausible adjectival analysis of `geöffnet` can become an impossible sentence-level result.

## The example has two coherent analyses, but the current mixed result is not one of them

`Die Banken sind geöffnet.` permits at least these two analyses:

| Analysis | High-level targets under the current Dumgen boundary | Lemma result |
|---|---|---|
| `sein`-passive / result state of an opening event | one fixed verbal target `[sind, geöffnet]`; either click reaches the same target | `öffnen`, `Lexeme/VERB`; `geöffnet` is `VerbForm=Part`; `sind` is an auxiliary member, not itself the `öffnen` Lemma |
| copula plus property adjective (“the banks are open”) | separate targets `[sind]` and `[geöffnet]`, because copulas and their predicates remain separate | `sein`, `Lexeme/AUX`, plus `geöffnet`, `Lexeme/ADJ` |

IDS grammis defines the *sein*-passive as `sein` plus the Partizip II of a lexical verb, expressing a state, and uses `Das Gartentor wurde geöffnet → Das Gartentor war geöffnet` as its first example. It limits this analysis to cases with a corresponding *werden*-passive. Thus a verbal state-passive analysis of `sind geöffnet` is grammatically defensible; it is not necessary to call every state-denoting use adjectival. [IDS, *sein-Passiv*](https://grammis.ids-mannheim.de/terminologie/355)

The repository has already decided that realized perfect/passive auxiliaries belong to the lexical verb's high-level Analysis Target, while copulas with predicates remain separate targets. It also requires click-invariant membership. Therefore the decision between the two rows must happen once for the occurrence, before resolving either click; it cannot be independently re-decided for `sind` and `geöffnet`. [Dumgen context](../../CONTEXT.md), [ADR 0004](../../../../docs/adr/0004-align-german-high-level-targets-with-fixed-realized-attestation-members.md)

## What the primary sources actually establish

### Partizip I is theoretically disputed and is not parallel to Partizip II

IDS grammis defines Partizip I as an adjective created from a verb by word formation. It can head attributive, adverbial, and predicative participial phrases; attributively it declines like an adjective. The same IDS page explicitly records the competing Duden analysis: Partizip I as an infinite verb form, motivated by its incomplete adjectival behavior and retained verbal valency. [IDS, *Partizip I*](https://grammis.ids-mannheim.de/terminologie/180)

IDS's current cross-framework terminology summarizes the compromise more directly: Partizip I is used primarily as a *Verbaladjektiv*; Partizip II is used both as an infinite verb form and as a *Verbaladjektiv*. It lists attributive, predicative, and adverbial participial-adjective uses while also allowing both participles as the sole verbal component of non-finite subordinate clauses. [IDS, *Partizipien*](https://grammis.ids-mannheim.de/sgt/2240?termini=term)

This dispute cannot be settled by appealing to membership in the German verbal complex: IDS explicitly says that Partizip I is never part of an analytically formed verb form, unlike Partizip II. [IDS, *Partizip II*](https://grammis.ids-mannheim.de/terminologie/181)

The TIGER/STTS annotation manual takes the contextual route: both present and past participles used adjectivally receive `ADJA` or `ADJD`. Its examples tag attributive `befragte` as `ADJA` and adverbial `verpassend` as `ADJD`. [TIGER annotation manual, pp. 38–39](https://www.ims.uni-stuttgart.de/documents/ressourcen/korpora/tiger-corpus/annotation/tiger_scheme-syntax.pdf#page=39)

Consequently, the repository's current rule “non-attributive Partizip I → `VERB`” is a project choice, not an STTS/IDS consensus. `Sie kam lachend herein` and `Er saß schweigend am Fenster` are the sharp cases: an IDS/STTS-style contextual policy makes `lachend` and `schweigend` adjectival/adverbial uses of a participle, while an inflection-first policy can keep them under their verbs.

### Partizip II is verbal in analytic perfect and passive complexes

IDS defines Partizip II as an infinite verb form and states that it is part of the verbal complex in analytic perfect tenses and the passive. It also says that Partizip II can form phrases in adjectival environments. [IDS, *Partizip II*](https://grammis.ids-mannheim.de/terminologie/181)

This yields stable anchors:

| Context | Defensible baseline classification | Baseline lemma |
|---|---|---|
| `hat die Bank geöffnet` (perfect) | `geöffnet`: `VERB`, Partizip II; `hat`: perfect auxiliary | `öffnen` |
| `wird die Bank geöffnet` (werden-passive) | `geöffnet`: `VERB`, Partizip II; `wird`: passive auxiliary | `öffnen` |
| `ist angekommen` (sein-perfect) | `angekommen`: `VERB`, Partizip II; `ist`: perfect auxiliary | `ankommen` |
| `ist geöffnet` (sein-state) | genuinely boundary-sensitive: verbal *sein*-passive or copular `ADJ` | `öffnen` or `geöffnet`, depending on the chosen analysis |
| `die geöffnete Bank` | adjectival context under STTS/TIGER; lexical identity still needs a project policy | `öffnen` or `geöffnet`, depending on lemma policy |
| `der Reisende`, `die Verletzten` | substantivized/lexicalized nominal use under STTS/German GSD | nominal lemma such as `Reisende` / `Verletzter` |

### Predicative Partizip II needs diagnostics; position alone is insufficient

The TIGER/STTS manual says the state passive and the copular sentence are often hard to distinguish. Its policy keeps a productive relation to the verbal paradigm visible as `VVPP`, but uses `ADJD` for lexicalized, idiomatized adjective meanings. Its main diagnostic is whether a corresponding *werden*-passive with a *von*-phrase preserves the meaning. It tags the exact example `Die Tür ist geöffnet` as `VVPP`, but `Die Tür ist ungeöffnet` as `ADJD`; it also contrasts verbal and adjectival readings of `verrückt` and `gebildet`. [TIGER annotation manual, pp. 69–70](https://www.ims.uni-stuttgart.de/documents/ressourcen/korpora/tiger-corpus/annotation/tiger_scheme-syntax.pdf#page=70)

The later official STTS workshop record turns this into an ordered decision aid: check dictionary lexicalization; test an active paraphrase with the same semantics; test a *von*-PP or similar preservation of verb semantics; test whether a semantically similar adjective is available; otherwise use `ADJD`. This is explicitly presented as a response to the hard `VVPP`/`ADJD` boundary, not as a perfect linguistic test. [STTS workshop record, p. 9](https://www.ims.uni-stuttgart.de/events/STTS-Workshop/pdfs/stts_zinsmeister_120924.pdf#page=10)

STTS is version-sensitive. The 2017 **STTS 2.0** guidelines for spoken-language transcripts use a more distributional policy: attributive P1/P2 receive `ADJA`, adverbial P1/P2 receive `ADJD`, substantivized forms receive `NN`, and perfect/passive forms receive `VVPP`; their predicative diagnostics allow `Die Tür ist geöffnet` to reach `ADJD`. The older TIGER manual reaches the opposite result for the same phrase. A project policy therefore needs to name the STTS edition, not simply say "follow STTS." [STTS 2.0 guidelines, §§3.2, 3.12.3, 4.8](https://ids-pub.bsz-bw.de/frontdoor/deliver/index/docId/6063/file/Westpfahl_Schmidt_Jonietz_Borlinghaus_STTS_2_0_2017.pdf)

IDS's systematic grammar explains why both outcomes persist. Evidence for an adjectival analysis includes lexicalized meaning, compatibility with other copulas such as `bleiben`/`wirken`, adjective-specific intensifiers, and `un-`; evidence for a verbal analysis includes lack of ordinary comparison, verb-group modifiers, coordination behavior, and retained verbal valency. IDS concludes that *sein*-state constructions with verbal behavior contain the participle before conversion, while those with adjectival behavior contain a converted adjective. [IDS, *Sind die Zustandsformen mit sein überhaupt Verbformen?*](https://grammis.ids-mannheim.de/systematische-grammatik/1125)

These diagnostics mean that “all bare or predicative P2 → `VERB`” is reproducible but too coarse. It suppresses independently lexicalized/property readings such as `bekannt`, `begabt`, or contextually property-like `verheiratet`. Conversely, “all `sein + P2` → `ADJ`” destroys the productive *sein*-passive and contradicts the exact TIGER `Die Tür ist geöffnet` analysis.

### UD exposes two layers rather than eliminating the boundary

The universal UD specification says participles may be classified as `ADJ`, `NOUN`, or `VERB` depending on language and context. It defines the lemma as the dictionary/base form, but says derivational morphology is not removed. [UD `ADJ`](https://universaldependencies.org/u/pos/ADJ.html), [UD `VERB`](https://universaldependencies.org/u/pos/VERB.html), [UD morphology and lemmas](https://universaldependencies.org/u/overview/morphology.html)

The German UD overview gives a narrower headline rule: `VerbForm=Part` is tagged `VERB` or `AUX`. The official German treebanks nevertheless contain both outcomes. German HDT has the near-exact `Erstmals sind alle zehn Filialen ... parallel geöffnet`, with `sind/sein/AUX` and `geöffnet/öffnen/VERB`; German GSD annotates `Die Schule blieb ... geöffnet` as `UPOS=ADJ`, `XPOS=VVPP`, `Lemma=öffnen`, `Degree=Pos`, and `VerbForm=Part`, but passive `wurde ... geöffnet` as `VERB`, lemma `öffnen`, `VerbForm=Part`. [UD German overview](https://universaldependencies.org/de/), [German HDT `sind ... geöffnet`](https://github.com/UniversalDependencies/UD_German-HDT/blob/8359ac9bdf5e96fdc64c519d28d74882d8c01bad/de_hdt-ud-dev.conllu#L215269), [German GSD `blieb ... geöffnet`](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L49555-L49570), [German GSD passive `wurde ... geöffnet`](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L123036-L123050)

GSD is evidence of ecosystem representation, not a clean normative lemma oracle: its own documentation says lemmas, XPOS, and features were assigned by programs without manual checking, while UPOS was converted automatically from non-UD manual annotation. [German GSD documentation](https://universaldependencies.org/treebanks/de_gsd/index.html)

That hybrid is valuable evidence, but not a Dumling-ready identity rule. In GSD, contextual `ADJ` can coexist with the verbal lemma `öffnen` and `VerbForm=Part`. Dumling instead defines Lemma identity using `canonicalForm + family + kind + coreFeatures`; changing `VERB` to `ADJ` necessarily creates a different Lemma even if `canonicalForm` were kept as `öffnen`. [Lemma identity ADR](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)

## Policy options

### Policy A: inflection-first, transparent P1/P2 always realize the verb

Rule: classify every synchronically transparent participle as `Lexeme/VERB` (`AUX` for auxiliary participles); create `ADJ` or `NOUN` only after independent lexicalization.

Implications:

- **Strengths:** one lexical Lemma (`öffnen`) across finite, infinitive, P1, and P2 forms; simple learner lookup; perfect, passive, attributive, predicative, and adverbial occurrences cannot fragment into duplicate Lemmas.
- **Costs:** contextual POS becomes inaccurate or unavailable; P1 is forced into the verb inventory despite never forming an analytic German verb form; adjective agreement cannot be represented faithfully by the current VERB feature codec, which lacks `Case`; substantivized productive uses need an explicit exception.
- **Target behavior:** `sind geöffnet` tends to become one target whenever `geöffnet` is transparent, even when ordinary speakers understand a copular property adjective.
- **Lemma:** `öffnen`, `lachen`, `schweigen`; an adjective Lemma is created only for clearly lexicalized meanings such as adjective `bekannt`.

This is the simplest “forms of the verb” answer, but it intentionally models lexical ancestry rather than contextual part of speech.

### Policy B: contextual STTS-style POS

Rule: classify the occurrence by its syntactic use. P2 inside perfect/passive complexes is `VERB`; adjectivally used P1/P2 is `ADJ`; substantivized forms are `NOUN`; lexicalized adjective meanings are `ADJ`. Resolve `sein + P2` with documented diagnostics.

Implications:

- **Strengths:** fits STTS/TIGER annotation practice and the universal UD position; preserves adjective case/gender/number/degree in the ADJ codec; makes copula-versus-passive target membership explicit.
- **Costs:** one derivational family splits into multiple Dumling Lemmas because `Kind` participates in identity; predicative P2 is gradient and sometimes genuinely ambiguous; the classifier needs lexical evidence and sentence-level diagnostics, not a suffix/position rule.
- **Target behavior:** `sind geöffnet` is one target only when classified as a *sein*-passive. Under the adjective reading, `[sind]` and `[geöffnet]` are separate.
- **Lemma:** use verbal infinitives for `VERB` occurrences. For `ADJ` occurrences, either use adjective citation forms (`geöffnet`, `lachend`) or adopt an explicit hybrid lemma convention; do not silently vary between them.

This is the best option if Dumling's `Kind` is intended to mean contextual POS.

### Policy C: lexicalized-only adjective boundary for predicative P2

Rule: use Policy B for clear analytic, attributive/adverbial, and nominal contexts, but keep bare predicative P2 under `VERB` whenever a same-meaning active/*werden*-passive paraphrase is productive. Use `ADJ` only for a dictionary-established or semantically diverged adjective.

Implications:

- **Strengths:** close to the detailed TIGER state-passive rule; preserves the productive verbal link for exact examples such as `Die Tür ist geöffnet`; is much more precise than the current blanket “non-attributive → VERB” rule.
- **Costs:** dictionary edition and sense granularity become classification dependencies; active/passive paraphrase judgments can change with context; `Die Banken sind geöffnet` may remain ambiguous between “someone has opened the banks” and the establishment property “open for business.”
- **Lemma:** `öffnen` for the productive passive reading; `geöffnet` for an established adjective reading, with an explicit relation to `öffnen` if the project wants that connection.

This is a viable conservative policy when the project wants few adjective Lemmas, but it still requires a real ambiguity strategy.

### Policy D: introduce a dedicated `Participle` Kind

Rule: P1/P2 become their own lexical Kind, neither `VERB` nor `ADJ`; contextual role and P1/P2 subtype live on Surface or analysis metadata.

Implications:

- **Strengths:** represents the traditional “Mittelwort” intuition and avoids prematurely choosing a side.
- **Costs:** creates a Lemma for a highly productive form of nearly every verb; does not itself say whether the occurrence is part of a verbal complex or an adjective phrase; requires new codecs, dispatch routes, corpora, and Reading migration; diverges from STTS and UD interoperability.
- **Naming hazard:** do not reuse Dumling/UD `PART`; that tag means *particle*, not participle.
- **Lemma:** must choose between a participial form (`geöffnet`, `lachend`) and source verb (`öffnen`, `lachen`) and still needs an explicit source relation.

This adds a category without resolving the target-membership question, so it has the highest implementation cost and the weakest payoff.

### Policy E: model lexical identity and contextual POS as separate axes

Rule: retain one lexical/source analysis and separately annotate contextual syntactic category/use. Two practical variants are possible:

1. Keep a productive participle on the `VERB` Lemma and add Surface/analysis fields for `Attributive | Predicative | Adverbial | VerbalComplex`, plus the applicable adjective agreement bundle.
2. Keep contextual `ADJ`/`NOUN` Lemmas, but add an explicit grammatical derivation/source relation to the base `VERB` Lemma and retain participial morphology on the Surface.

Implications:

- **Strengths:** directly represents what the sources show: verbal origin and valency can coexist with adjective syntax; avoids making one field answer two questions; supports learner navigation from `geöffnet` to `öffnen` without pretending that both are the same grammatical identity.
- **Costs:** requires a domain/schema decision and migration. Variant 1 weakens the present rule that a Surface's feature schema is entirely selected by its Lemma Kind. Variant 2 preserves that rule but creates multiple Lemmas and requires an explicit relation.
- **Target behavior:** the contextual analysis still decides whether `sind` belongs to the same Analysis Target; lexical derivation never decides membership by itself.
- **Lemma:** verbal complex → `öffnen`; converted/lexical adjective → `geöffnet`; nominalized lexical item → its nominal citation form. The derivational link is explicit rather than encoded by a surprising canonical form.

This is the cleanest long-term policy if Texteater needs both dictionary identity and reliable syntax. If the project is unwilling to add a second axis, choose Policy B or C explicitly and accept Lemma splitting.

## Lemma policy must be decided together with POS policy

Three lemma conventions are available for an adjectivally classified participle:

| Convention | Example ADJ Lemma | Benefit | Failure mode in Dumling |
|---|---|---|---|
| base-verb lemma | `öffnen`, Kind `ADJ` | mirrors some German GSD records; easy connection to verb | `öffnen/ADJ` is not a normal adjective citation form and is a different Lemma from `öffnen/VERB` anyway |
| participial adjective lemma | `geöffnet`, Kind `ADJ` | normal learner-facing adjective identity; agrees with UD's rule not to erase derivation | needs an explicit `derivedFrom öffnen` relation to preserve the family connection |
| one verb Lemma plus contextual Surface POS | `öffnen`, Kind `VERB`; Surface says adjectival use | no duplicate lexical identity | requires a new axis because current Surface schemas inherit their feature inventory from Lemma Kind |

For lexicalized adjectives, the participial adjective lemma is the defensible default. For analytic perfect/passive forms, the verb infinitive is the defensible default. The open question is productive conversion such as `die geöffnete Tür`; it cannot be solved independently of whether `Kind` means lexical class or contextual POS.

For substantivized items, German STTS/GSD practice supports a nominal Lemma rather than the source verb. The German GSD treebank, for example, uses `Reisende/NOUN`, `Angestellte/NOUN`, and `Verletzter/NOUN` in nominal contexts. These are separate learner-facing grammatical identities even though their histories remain transparent. [German GSD nominal `Reisende`](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-train.conllu#L53289-L53306), [German GSD nominal `Verletzten`](https://github.com/UniversalDependencies/UD_German-GSD/blob/ce54dbe9c6a5640c93e9952f069f582f6cd1f9fc/de_gsd-ud-test.conllu#L16819-L16832)

## Recommended near-term decision shape

1. **Make the sentence-level analysis authoritative.** Target Classification must decide between *sein*-passive and copula-plus-adjective once, then reuse that result for every click. The present `sind → öffnen/VERB` plus `geöffnet → geöffnet/ADJ` pair should be rejected as click-inconsistent.
2. **Write separate policies for P1 and P2.** P1 never forms an analytic German verb complex, and a combined rule hides that difference. If no schema change is desired, use contextual `ADJ` for ordinary attributive, predicative, and adverbial P1; reserve `VERB` for an explicitly chosen rare verbal/supplement analysis.
3. **Keep unambiguous P2 complexes verbal.** Perfect, *werden*-passive, *sein*-perfect, and perfect-passive P2 occurrences resolve to the base VERB Lemma and group their fixed auxiliaries under ADR 0004.
4. **Choose and document a predicative P2 default.** A defensible conservative default is Policy C: productive passive paraphrase → `VERB`; established/semantically diverged property adjective → `ADJ`; unresolved genuine ambiguity becomes an explicit classification limitation rather than two incompatible click results.
5. **Use participial adjective citation forms for actual ADJ Lemmas.** Prefer `geöffnet/ADJ`, not `öffnen/ADJ`; preserve the source relation explicitly when the domain gains that relation. Do not copy GSD's hybrid lemma convention into Dumling accidentally, because Dumling's identity semantics differ.
6. **Do not add a `Participle` Kind merely to postpone the decision.** It does not determine target membership and would multiply routes and Lemmas.

If the product goal is strongest learner continuity rather than treebank-style POS, Policy E variant 1 is preferable to Policy A: keep the `öffnen` Lemma, but explicitly record that `geöffnet` is functioning adjectivally. That preserves the useful continuity without calling contextual syntax something it is not.

## Required corpus probes before accepting a policy

The policy should be tested on paired cases where only the decisive evidence changes:

- perfect / *werden*-passive / *sein*-passive: `hat geöffnet`, `wird geöffnet`, `ist geöffnet`;
- same participle, verbal and lexicalized adjective meanings: `Der Tisch ist verrückt` versus `Der Mann ist verrückt`;
- productive and negated result forms: `geöffnet` versus `ungeöffnet`;
- P1 across functions: `der lachende Junge`, `lachend kam er herein`, `das ist störend`;
- P2 with retained verbal arguments: `die von der Technikerin geöffnete Tür`;
- adjectival diagnostics: degree/intensifier/coordination where natural (`sehr bekannt`, `bekannt und beliebt`);
- nominalization: `der Reisende`, `die Verletzten`, contrasted with an overt noun head;
- lexicalized versus productive pairs: `gebildet`, `bekannt`, `verheiratet`, `geschlossen`;
- every ambiguous sentence clicked once on the auxiliary/copula and once on the participle, asserting identical target membership.

The corpus oracle must record `Kind`, the chosen analysis label, and the reason. Labels include `Perfect`, `WerdenPassive`, `SeinPassive`, `CopularAdjective`, `AttributiveConversion`, `AdverbialConversion`, `LexicalizedAdjective`, and `Nominalized`. They can remain corpus metadata; they need not become durable Dumrel Knowledge.

## Repository impact

- Before ADR 0007, the classification note said attributive P1/P2 → `ADJ`, non-attributive lexical P1/P2 → `VERB`, auxiliary participles → `AUX`, and substantivized forms → `NOUN`. ADR 0007 replaced that blanket non-attributive rule with the TIGER boundary. [Current verb rule](../../../../app/dumling-docs/src/classification-logbook/de/rule-about-verbs.md)
- The ADJ codec can express case, degree, gender, and number, but not participial `VerbForm`, tense, or a source verb. The VERB participle codec can express `VerbForm=Part`, gender, number, tense, aspect, and voice, but not case. Neither can preserve the full German GSD hybrid analysis. [ADJ feature codec](../../../dumling/src/schemas/concrete-language/features/de/lexeme/adjective.ts), [VERB feature codec](../../../dumling/src/schemas/concrete-language/features/de/lexeme/verb.ts)
- At research time, docs and corpora classified `lachend`/`schweigend` as `VERB`, predicative `geschlossen`/`verheiratet` as `VERB`, and attributive `lachende`/`geschlossene` as `ADJ`. The ADR 0007 implementation migrated the prompt policy and added paired regression cases for the new boundary. [Classification logbook rule](../../../../app/dumling-docs/src/classification-logbook/de/rule-about-verbs.md), [prompt-policy logbook](../persistent/prompt-logbook.md)
- `PART` is already the particle route in Dumling and UD German. A participle category must never be represented by that existing Kind. [German UD overview](https://universaldependencies.org/de/), [Dumling German subtree](../../../dumling/src/schemas/concrete-language/features/de/de-subtree.ts)
