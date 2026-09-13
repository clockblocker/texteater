import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/ADJ"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/adjective",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/ADJ occurrence.
Return its attested Surface analysis and dictionary Lemma. Do not classify the
target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }.
Every TARGET span marks one supplied member, and members repeats those exact
texts in source order. Both projections are authoritative. Never reject,
repair, add, remove, merge, split, or reorder membership.
</input_contract>

<route_contract>
Target Classification already established Lexeme/ADJ and complete membership.
The operation is total: always resolve the supplied occurrence. Context may
distinguish a productive adverbial ADJ from lexical ADV, an ordinal or cardinal
ADJ from NUM, a color ADJ from a NOUN, or an established participial ADJ from a
verbal participle. Trust the ADJ route and resolve its grammar; never return a
different route.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every
supplied member. Standard includes canonical spelling, ordinary
sentence-initial capitalization, licensed variants, and invariant forms. Typo
is only a genuine spelling error.

For each Standard member, preserve the complete contextual morphology except
lowercase ordinary sentence-initial capitalization. Repair only Typo members.
Never replace an inflected Surface with its Lemma. Array position is the
alignment key. Sentence-initial lowercasing also applies when the adjective is
suffixless and predicative; normalize that initial Standard member to lowercase.
</member_projection>

<surface_inflection>
Use null inflectionalFeatures only when context explicitly presents the adjective as a
dictionary or citation form. Use inflectionalFeatures: null for that mention.

Every ordinary contextual occurrence has marked inflectionalFeatures, including suffixless
predicative and adverbial uses. The inflectionalFeatures object includes exactly:
{
  case: "Acc" | "Dat" | "Gen" | "Nom" | null,
  degree: "Cmp" | "Pos" | "Sup" | null,
  gender: "Fem" | "Masc" | "Neut" | null,
  number: "Plur" | "Sing" | null
}
At least one value must be non-null.
</surface_inflection>

<inflection>
Degree is Pos for positive forms, Cmp for comparatives, and Sup for
superlatives. Attributive adjectives carry contextual Case, Gender, and Number
from their noun phrase even when the ending is syncretic. Predicative and
adverbial adjectives have null Case, Gender, and Number. Nearby nouns do not
give agreement to those suffixless uses.

Keep comparison paradigms. The Lemma canonicalForm is the positive dictionary
adjective: besser and beste map to gut; höher maps to hoch; näher maps to nah.
In am sorgfältigsten, only the marked adjective is the Surface.
</inflection>

<lemma_and_features>
lemma.coreFeatures contains exactly four nullable keys:
{
  abbr: "Yes" | null,
  foreign: "Yes" | null,
  numType: "Card" | "Ord" | null,
  variant: "Short" | null
}
Use abbr Yes for an established adjective abbreviation, foreign Yes for an
overt foreign adjective identity, Ord for ordinal adjectives, and Card for a
cardinal adjective on this fixed route. Use variant Short only for a licensed
short Lemma identity, never merely because a predicative or adverbial Surface
lacks an ending. When the Surface abbreviates a full adjective Lemma, use abbr
Yes and variant null; do not relabel the abbreviation as variant Short.
Otherwise use null. Nullable keys are never omitted.

Participles already classified as ADJ keep an adjective Lemma: geschlossene
maps to geschlossen, spannende maps to spannend, and lexicalized predicative
verrückt maps to verrückt. Adverbially used Partizip I such as lachend also
keeps its participial adjective Lemma. Productive perfect, passive, and TIGER
state-passive participles are fixed upstream as VERB and never enter this
route. Invariant attributive color forms still receive contextual agreement.
</lemma_and_features>

<surface_features>
surface.spelling is Variant only for a licensed variant or abbreviation and
Canonical otherwise. surface.surfaceFeatures is null unless the attested use is
archaic; then use { historicalStatus: "Archaic" }. An old poetic adjective use
is archaic even when its inflection is ordinary. Current adjectives keep null.
</surface_features>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling, surfaceFeatures, and inflectionalFeatures.
Use null inflectionalFeatures when no inflectional evidence is marked; otherwise
use the feature object allowed by the response schema. Do not emit a Surface
discriminator.

Set realizationCoverage to Full. This route has no Partial production policy. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-adj-demo-citation-sanft",
		"grammar-de-adj-demo-attributive-klein",
		"grammar-de-adj-demo-adverbial-schnell",
		"grammar-de-adj-demo-comparative-besser",
		"grammar-de-adj-demo-ordinal-erste",
		"grammar-de-adj-demo-typo-freundlcih",
	],
	source: import.meta.url,
});
