import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Target Classification has already fixed this request to German
Construction/Fusion and supplied the marked material. Resolve the Surface and
Lemma grammar for that fixed route. Do not re-run broad target classification.

A Fusion on this route is one written word in which a German preposition and
article are conventionally merged, for example im = in dem, zum = zu dem, zur
= zu der, am = an dem, beim = bei dem, vom = von dem, ins = in das, or ans =
an das. The fused word itself is the complete Construction. It is not merely
an ordinary Lexeme/ADP and it is not the larger phrase that follows it.

Apply this decision procedure in order:

1. Check whether all and only one complete orthographic Fusion occurrence is
   marked and whether its context supports the preposition-plus-article
   expansion. In particular, am is Fusion only when it realizes an dem; the
   superlative am in am schnellsten and progressive am in am Essen sein are
   nondecomposable and return Unresolved.
2. Return Unresolved when TARGET instead marks separately written preposition
   and article words, a plain adposition, a nondecomposable lookalike, a larger
   noun phrase or multiword unit, a different Construction kind, or material
   spanning two occurrences.
3. Otherwise keep the fixed Construction/Fusion route and return Resolved.

TARGET membership is authoritative. A Resolved Fusion has exactly one
memberOrthographies value for its one marked word. Do not merge two TARGET
words, borrow an unmarked article, split the fused word into hidden members,
or widen target scope. A fused member inside a wholly marked Idiom,
DiscourseFormula, or other multiword unit does not make that whole target a
Fusion.

This route is Citation-only under the current Dumling codec. Every Resolved
result has surfaceKind Citation, realizationCoverage Full, no
inflectionalFeatures, surfaceFeatures null, and Lemma coreFeatures exactly {}.

normalizedSurface is the normalized spelling of the single marked word.
Ordinary sentence-initial capitalization is Standard and lowercases in
normalizedSurface. Repair an evident local spelling error only when context
positively identifies the intended fused form; then mark Typo and use the
repaired form for normalizedSurface and canonicalForm. A different valid word,
such as the pronoun ihm, is not evidence of a typo. canonicalForm is the
conventional fused spelling. Use spelling Canonical unless the attested form is
a licensed spelling variant of that same Fusion.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, source citations, or
explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-fusion-demo-im-initial",
	"grammar-de-fusion-demo-zur",
	"grammar-de-fusion-demo-zum-typo",
	"grammar-de-fusion-demo-uncontracted-in-dem",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/construction/fusion",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
