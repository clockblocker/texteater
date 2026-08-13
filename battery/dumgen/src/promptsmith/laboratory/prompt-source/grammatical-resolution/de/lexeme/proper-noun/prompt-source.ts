import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<task>
Resolve the grammar of one already-classified German Lexeme/PROPN occurrence.
Input is exactly {markedContext: string, members: string[]}. TARGET contents and
members are the complete ordered lexical membership.
Always return one total flat resolution. Route classification and membership selection happened
upstream; never reject, add, remove, merge, split, reorder, or reclassify a
member.
</task>

<membership>
Return one memberOrthographies and one normalizedMembers entry per supplied
member. A proper name may have one member or several separately marked members.
All supplied members together form this classified PROPN Surface, including
function words or title articles that upstream included. Preserve exact order
and punctuation between members through their separate normalized values;
never absorb an unmarked title, common noun, adjective, number, or neighbor.
An earlier unmarked occurrence does not affect the supplied occurrence.

Standard includes registered capitalization, internal capitals, lowercase
brand styling, abbreviations, and licensed variants. Typo means an actual
spelling or casing error. Repair only Typo members. normalizedMembers preserves
contextual case suffixes, registered styling, and the characters of licensed
variants. Preserve a genitive apostrophe only when that apostrophe is inside the
authoritative supplied member string; never import surrounding punctuation from
outside TARGET into normalizedMembers. Never replace contextual forms with
Lemma forms or expand an abbreviation.
</membership>

<surface>
Use Citation for an explicit name-entry, dictionary, register, or quoted-title
mention without contextual name case/number. Case carried by a surrounding
label such as Titel or Eintrag belongs to that common noun and is never copied
onto the quoted name. Use Inflection for ordinary contextual
occurrences—including organizations, acronyms, stylized brands, direct address,
and names described as historical forms. Lexical uncertainty never licenses
Citation for a contextual occurrence. Its inflectionalFeatures contains exactly case and number; at
least one must be non-null. Resolve Acc, Dat, Gen, or Nom from syntax, articles,
and government. Directional nach with a destination name is Acc; static in with
a location name is Dat. A vocative has case null but normally number Sing. Plural-only
names use number Plur. A multi-member name has one feature bag for the whole
Surface, not one per member.

spelling is Canonical for the ordinary Lemma form and for a repaired Typo. Use
Variant only when context establishes a licensed alternative spelling,
historical exonym, or transliteration of another canonicalForm. A registered
stylized spelling is Canonical, not automatically Variant. surfaceFeatures is
null except when the exact occurrence is identified as archaic or historical;
then use {historicalStatus:"Archaic"}.
</surface>

<lemma>
canonicalForm is the complete normalized citation identity of the same name.
For a multi-member name, join its complete lexical members in conventional
orthography, including spaces or name-internal hyphens. Strip contextual
genitive -s or apostrophe only from canonicalForm, never normalizedMembers. A
Typo resolves to the repaired identity. A licensed variant or historical
exonym may have a different canonicalForm only when context establishes that
relation; do not silently translate or modernize a name.

coreFeatures contains exactly {abbr, foreign, gender}; all keys are mandatory
and nullable. abbr Yes requires an established abbreviated name identity, not
capital shape alone. foreign Yes requires an overt source-language name in the
German context; an established German exonym or loan name is not Foreign merely
because of origin. A brand or product's non-German origin never suffices for
Foreign when the name is used as an established German lexical identity. gender is stable grammatical identity Fem, Masc, or Neut
only when established by a person's identity, lexical convention, or reliable
agreement. Do not infer personal gender from name shape alone. Plural-only
geographic names have gender null because plural does not encode it.
</lemma>

<fixed_route_distinctions>
The PROPN route is authoritative. A common-looking component inside the supplied
name remains part of this PROPN; a supplied article inside a work title is not
removed as DET; a supplied numeric or adjectival-looking component is not
reclassified. Conversely, unmarked titles, common nouns, appositions, and
neighbors remain context. Resolve exactly the supplied members.
</fixed_route_distinctions>

<output>
Return exactly memberOrthographies, normalizedMembers, surface, and lemma.
Never return decision, resolution, Unresolved, realizationCoverage, language,
family, kind, normalizedSurface, a linked Lemma inside Surface, entity type,
route data, target indices, confidence, candidates, or explanations. The app
injects route/language/linkage, normalized Surface, successful result, and
realizationCoverage Full.
</output>

<self_check>
Counts match members; membership is unchanged; Citation has no surfaceKind or
inflectionalFeatures; Inflection has surfaceKind Inflection and a non-empty
case/number bag; all nullable Core Feature keys are present.
</self_check>`;

export const demonstrations = corpus.select([
	"grammar-de-propn-demo-person-maria",
	"grammar-de-propn-demo-place-berlin",
	"grammar-de-propn-demo-multi-angela-merkel",
	"grammar-de-propn-demo-genitive-hans",
	"grammar-de-propn-demo-acronym-nato",
	"grammar-de-propn-demo-typo-koelnn",
	"grammar-de-propn-demo-citation-work-tonio-kroeger",
	"grammar-de-propn-demo-org-unesco",
	"grammar-de-propn-demo-vocative-clara",
	"grammar-de-propn-demo-stylized-ebay",
	"grammar-de-propn-demo-org-rotes-kreuz",
	"grammar-de-propn-demo-work-physiker",
	"grammar-de-propn-demo-integrated-lego",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
