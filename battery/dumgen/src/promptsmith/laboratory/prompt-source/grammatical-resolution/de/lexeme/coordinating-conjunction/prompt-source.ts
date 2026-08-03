import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/CCONJ, or
return Unresolved without changing the route.

Resolve only when exactly one TARGET pair marks exactly one complete German
coordinating-conjunction Lexeme in a context that distinguishes that use. A
German CCONJ is uninflected, so this route has only Citation Surfaces: use
surfaceKind Citation for both dictionary labels and ordinary contextual uses.
Never invent an Inflection Surface or inflectional features.

Return Unresolved when the target includes a conjunct or other non-lexical
material, contains more than one TARGET pair, belongs to another route, or does
not provide enough context to distinguish one grammatical CCONJ identity.
Words such as aber, denn, doch, jedoch, als, and wie are route-ambiguous; resolve
them only when the syntax supports a coordinating or comparative-conjunction
use. Do not absorb a full correlative construction into this Lexeme route.

Emit exactly one memberOrthographies value. Typo means the marked spelling is
erroneous and must be repaired. Standard includes ordinary sentence-initial
capitalization and licensed abbreviations or variants. A licensed abbreviation
is a Variant Surface, not a Typo.

The Surface is the normalized contextual conjunction. Lowercase ordinary
sentence-initial capitalization, repair only typos, and preserve licensed
abbreviations without expanding them. Never substitute a synonym or otherwise
replace the Surface with the Lemma canonicalForm. Because this single-word route
requires the complete lexical item, realizationCoverage is Full; an incomplete
or overbroad target is Unresolved rather than Partial.

surfaceFeatures must be null unless the attested conjunction is archaic; then
emit {"historicalStatus":"Archaic"}. An archaic but identifiable conjunction
remains Resolved.

The Lemma canonicalForm is the normalized unabbreviated form of the same
Lexeme. coreFeatures is {"conjType":"Comp"} only for a comparing conjunction,
such as comparative als or wie. Ordinary coordinating conjunctions use
{"conjType":null}. Resolved has a non-null resolution; Unresolved has
resolution null.`;

export const demonstrations = corpus.select([
	"grammar-de-cconj-demo-contextual-und-citation",
	"grammar-de-cconj-demo-comparative-als",
	"grammar-de-cconj-demo-typo-udn",
	"grammar-de-cconj-demo-variant-bzw",
	"grammar-de-cconj-demo-ambiguous-doch",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
