import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/ADJ, or
return Unresolved without changing the route.

Resolve only when every TARGET pair marks lexical material belonging to one
identifiable adjective Surface. A single TARGET pair does not prove valid
scope. Return Unresolved when the target contains an intensifier, modified
noun, auxiliary, or another syntactic dependent; when separate TARGET pairs
mark repeated occurrences rather than members of one Surface; when they mark
unrelated adjectives; or when the material belongs to ADV, VERB, or another
route. Productive predicative and adverbial uses of German adjectives remain
Lexeme/ADJ: schnell in sie läuft schnell is ADJ, not lexical ADV.

Before resolving, count literal opening and closing TARGET tags. They must be
balanced, and emit exactly one memberOrthographies value per opening tag in
textual order. Standard includes canonical spelling and ordinary
sentence-initial capitalization. Typo means an actual spelling or
inappropriate-casing error. normalizedMembers is the normalized contextual
adjective: lowercase ordinary capitalization and repair only typos, while
preserving the complete attested morphology and marked-member order. Never
substitute a synonym, silently add unmarked lexical material, or replace an
inflected form with its dictionary form. Except for ordinary sentence-initial
casing, a changed marked spelling requires Typo.

Use Citation only when the marked Surface is explicitly presented as a
dictionary entry or citation form. Ordinary contextual adjectives are
Inflection because German UD assigns Degree even when predicative or adverbial
use has no agreement suffix. Degree is Pos for a positive form, Cmp for a
comparative, and Sup for a superlative. Attributive adjectives additionally
carry every Case, Gender, and Number value licensed by their whole noun phrase.
Recover those agreement values from the determiner and noun when necessary:
even a syncretic plural adjective Surface carries the noun's lexical Gender.
Predicative and adverbial adjectives are uninflected for agreement, so their
Case, Gender, and Number are null. Do not manufacture agreement from a nearby
noun. Inflectional Features are a complete nullable bag: include case, degree,
gender, and number, and use null only where the contextual Surface does not
mark the feature.

Preserve comparison paradigms and irregularity. The canonicalForm is the
dictionary positive adjective, so besser and beste resolve to gut; a regular
comparative or superlative resolves to its positive Lemma. Do not treat the
article in am plus an unmarked superlative target as part of the adjective
Surface. Resolve only the marked adjective form.

surfaceFeatures is null unless the attested use is archaic, when it is
{"historicalStatus":"Archaic"}. Lemma coreFeatures are stable grammatical
identity and always include abbr, foreign, numType, and variant. abbr is Yes
only for an established abbreviated adjective Lemma; foreign is Yes only for
an established foreign Lemma. Ordinary ordinal adjective Lemmas use numType
Ord; cardinal adjective Lemmas on the ADJ route use numType Card. Otherwise
numType is null. variant is Short only for a registered short
variant identity; do not infer this Lemma Core Feature merely from ordinary
predicative or adverbial position. Otherwise these fields are null. Nullable
does not mean optional.

Resolve an established adjective formed from a participle when its ADJ Lemma
and the modeled agreement and Degree are identifiable; geschlossen in die
geschlossene Tür has canonicalForm geschlossen. Some treebank ADJ-Part analyses
retain a verbal Lemma or VerbForm/Tense that the current ADJ codec cannot
represent. Return Unresolved when that contrast prevents one representable ADJ
identity. A participle selected by a perfect auxiliary belongs to VERB and is
always Unresolved here.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-adj-citation-sanft",
	"grammar-de-adj-attributive-nom-masc-klein",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/adjective",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
