import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/NUM,
or return Unresolved without changing the route.

Resolve only when the TARGET markup isolates exactly one occurrence of exactly
one numeral Lexeme. Require one balanced opening and closing TARGET pair. A
numeric expression containing multiple syntactic numeral tokens, repeated
occurrences even of the same Lemma, unrelated targets, or a target that also
contains a noun or other dependent is Unresolved. Do not collapse a phrase into
one member or silently discard marked material.

German NUM is reserved here for definite cardinal numerals. Word forms, Arabic
digits, years, and Roman numerals can be NUM when they actually denote a number.
Ordinals such as zweiten and dritten are normally Lexeme/ADJ. Multiplicatives
such as zweimal and dreimal are Lexeme/ADV. Beide is Lexeme/DET. A numerical
component of a personal or entity name, such as II in Heinrich II, is
Lexeme/PROPN. A standalone mathematical or currency sign is Lexeme/SYM. Return
Unresolved for all of those route boundaries. Use context, not a digit-like
shape alone, to distinguish a numeral from a name component or symbol.

The authoritative German policy in this route uses numType Card. Although the
exact Dumling codec also admits Frac, Mult, and Range, German GSD does not
establish stable NUM analyses for those identities: ordinals are ADJ,
multiplicatives are ADV, and fraction glyphs are annotated Card. Return
Unresolved for an occurrence that would require choosing among those disputed
representations rather than inventing a policy.

Before resolving, count TARGET tags. Emit exactly one memberOrthographies value
for the single opening tag. Standard includes canonical spelling and ordinary
sentence-initial capitalization. Typo means an actual spelling or
inappropriate-casing error. normalizedSurface is the normalized contextual
numeral: lowercase an ordinary sentence-initial word and repair only typos,
while preserving digits, Roman-numeral casing, abbreviation casing, morphology,
and lexical identity. Except for ordinary sentence-initial casing, a changed
marked spelling requires Typo.

The codec has no NumForm feature. Never normalize a digit to its word spelling
or a word to digits: 7 has canonicalForm 7, not sieben. The Lemma canonicalForm
is the dictionary form of the same orthographic numeral identity, with typo
repair. Preserve an inflected quantity numeral's lemma, for example Millionen
has canonicalForm Million.

Use Citation for an uninflected numeral, including ordinary contextual cardinal
use. Use Inflection only when contextual morphology establishes at least one of
case, gender, or number; the exact Dumling schema forbids an all-null
inflectionalFeatures object. Fill established agreement and keep unestablished
features null. Citation Surfaces never carry inflectionalFeatures.

surfaceFeatures is null unless the attested use is archaic, when it is
{"historicalStatus":"Archaic"}. Lemma coreFeatures are stable identity: numType
is Card for every authoritative resolved case; abbr is Yes only for an
established numeral abbreviation; foreign is Yes only for an established
foreign Lemma. Otherwise those nullable features are null.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-num-word-vier",
	"grammar-de-num-inflected-millionen",
	"grammar-de-num-typo-dreii",
	"grammar-de-num-unresolved-overbroad-zehn-buecher",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/numeral",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
