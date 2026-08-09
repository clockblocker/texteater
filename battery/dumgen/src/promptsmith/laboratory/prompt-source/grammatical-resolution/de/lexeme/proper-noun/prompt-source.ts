import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/PROPN, or
return Unresolved without changing the route.

This is token-level grammatical resolution, not named-entity resolution. Resolve
only when exactly one balanced TARGET pair marks one complete occurrence of one
word-like proper-noun Lexeme. A word may be a name or one component of a larger
name, but a TARGET spanning a multiword personal, place, organization, or work
name contains several lexical units and is Unresolved here. Also return
Unresolved for repeated occurrences, unrelated targets, a title or common noun
marked together with a name, a syntactic dependent, another route, or context
that cannot establish one grammatical PROPN identity.

Use context rather than capitalization alone. Ordinary NOUN, ADJ, NUM, and
other-route material stays on its own route even inside a named expression.
Names normally preserve their registered capitalization. Incorrect casing or
spelling is a Typo, but do not capitalize a registered stylized name merely
because most proper names begin with a capital. Numeric name components,
foreign name components, abbreviations, stylized brands, organization Gender,
and productive pluralized surnames can have difficult policy edges in the
current codec; do not guess them from shape alone. Lexical evidence can
establish an organization name as abbreviated and gendered even though
all-caps or acronym shape alone cannot.

Emit exactly one memberOrthographies value for a Resolved result. Standard
means the marked spelling and casing are licensed for this Lexeme; Typo means a
repair is required. normalizedMembers is the normalized contextual name:
preserve canonical casing, contextual genitive suffixes and apostrophes, and
all lexical characters; repair only actual typos. Never replace the contextual
Surface with the Lemma canonicalForm, expand a marked unit into a full name, or
discard marked material. A spelling repair requires Typo. A licensed
noncanonical spelling is a Variant Surface, not a Typo.

Use Citation only when the context explicitly presents a name-entry or citation
label. An ordinary contextual proper name is Inflection and must carry every
case and number value established for that occurrence. The current Inflection
schema forbids an all-null feature bag. In a vocative, use case null rather than
inventing Nominative, while retaining established Number. If neither case nor
number is defensible, return Unresolved rather than misusing Citation.

The Lemma canonicalForm is the complete normalized citation form of the same
word-like proper noun. Strip contextual genitive -s or a genitive apostrophe
only from canonicalForm, never from normalizedMembers. coreFeatures are stable
grammatical identity and always contain abbr, foreign, and gender. Gender is
Fem, Masc, or Neut only when the grammatical identity is established from
reliable lexical and contextual evidence; never infer it from a person's name
shape. A lexical plural-only name has no modeled Gender because German plural
does not distinguish grammatical gender. Use abbr Yes only for an established
abbreviated proper-noun Lemma. An acronym is not automatically an abbreviation,
but reliable lexical evidence can establish one as abbreviated. Use foreign
Yes only for genuinely foreign material in German context. An established
German loan or name is not Foreign merely because its origin or spelling is
foreign. Otherwise use null; nullable does not mean optional.

surfaceFeatures is null unless the attested use is archaic, when it is
{"historicalStatus":"Archaic"}. realizationCoverage is Full because this route
resolves one complete word-like Lexeme; incomplete or overbroad targets are
Unresolved rather than Partial.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
named-entity types, target indices, Reading data, confidence, candidates, or
explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-propn-citation-dresden",
	"grammar-de-propn-nom-sing-maria",
	"grammar-de-propn-typo-koelnn",
	"grammar-de-propn-unresolved-multi-token-angela-merkel",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
