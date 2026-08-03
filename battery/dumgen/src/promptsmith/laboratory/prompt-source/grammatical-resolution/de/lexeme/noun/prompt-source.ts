import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/NOUN, or
return Unresolved without changing the route.

Resolve only when every TARGET pair marks lexical material belonging to one
identifiable noun Lexeme. Multiple TARGET pairs are allowed only when all are
members of that same Lexeme. Return Unresolved when a target includes a
syntactic dependent or modifier, combines unrelated nouns, belongs to another
route, or does not provide enough context to determine one grammatical noun
identity. Never guess missing gender or other identity features.

Count literal opening <TARGET> tags, not words, tokens, or hyphen parts. Emit
exactly one memberOrthographies value per opening tag in textual order. Typo means
an actual spelling error, including incorrect lowercase spelling of a German
common noun. Standard includes canonical spelling and licensed variants;
represent the latter as a Variant Surface rather than a Typo. If producing
normalizedSurface requires changing any marked characters to repair spelling or
casing, the corresponding memberOrthographies value must be Typo.

The Surface is the normalized contextual form. Copy Standard canonical lexical
material exactly; otherwise repair only typos and casing. Preserve inflectional
suffixes, lexical-member order, and lexical membership: never modernize
morphology, lemmatize the Surface, substitute a synonym, or insert unattested
material. realizationCoverage is Partial only when the attestation omits
lexical material from the complete Lemma, including coordinate ellipsis.

Use Citation only when the surrounding context presents the target as a
citation or entry label. A noun in an ordinary sentence is Inflection even when
its spelling matches the citation form. Determine case and number from the
syntax of the particular marked occurrence—its own determiner, preposition,
and clause role—not from another repeated token or a nearby noun phrase. If the
use has no modeled German case, such as a vocative, emit case null rather than
inventing Nominative.

surfaceFeatures must be null unless the attested Surface is archaic; then emit
{"historicalStatus":"Archaic"}. An archaic but identifiable noun remains
Resolved.

The Lemma's canonicalForm is the complete normalized citation form of the same
Lexeme, never a synonym or hypernym. coreFeatures contain only grammatical
identity. hyph is "Yes" only when the canonical Lemma spelling contains an
orthographic hyphen; otherwise it is null. Use null for unmarked nullable
features. Resolved has a non-null resolution; Unresolved has resolution null.`;

export const demonstrations = corpus.select([
	"grammar-de-noun-typo-kaffe",
	"grammar-de-noun-demo-unresolved-adjective-route",
	"grammar-de-noun-demo-citation-hyphen-u-boot",
	"grammar-de-noun-demo-unresolved-ambiguous-see",
	"grammar-de-noun-demo-archaic-antlitz",
	"grammar-de-noun-demo-lowercase-stadt",
	"grammar-de-noun-demo-unresolved-overbroad-rathaus",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
