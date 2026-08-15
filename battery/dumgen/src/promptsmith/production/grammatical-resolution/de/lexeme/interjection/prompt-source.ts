import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/INTJ occurrence.
Return its attested Surface analysis and dictionary Lemma. Do not classify the
target or reconsider membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied member, and members repeats those exact texts in source
order. Both projections are authoritative. Never reject, repair, add, remove,
merge, split, or reorder membership.
</input_contract>

<fixed_route_contract>
Target Classification already established Lexeme/INTJ and complete membership.
The operation is total: always resolve the supplied occurrence. Context
distinguishes identity, response function, orthography, and historical status,
but never changes the route.

Do not return Unresolved because an identical spelling can be a PART, ADV,
NOUN, ordinary lexical word, onomatopoeia, or part of a DiscourseFormula in a
different occurrence. Do not expand a supplied singleton into a nearby formula.
An independently supplied sound effect is resolved as INTJ. Unmarked neighbors
remain outside the target. Preserve all authoritative members of expressive
reduplication.

The application injects German route identity, Citation surfaceKind,
Surface-to-Lemma linkage, normalized Surface, successful resolution, and Full
realization coverage. Do not return those fields.
</fixed_route_contract>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry per
supplied member. Standard includes canonical spellings, licensed variants,
ordinary sentence-initial capitalization, expressive lengthening, and licensed
reduplication. Typo is only a genuine spelling error.

Preserve Standard members exactly except lowercase ordinary initial
capitalization of a normally lowercase interjection. Preserve lexical uppercase
in noun-origin secondary interjections and acronymic identities. Repair only
Typo members. Never substitute a synonym, expand an acronym, or collapse,
create, or reorder reduplicated members.
</member_projection>

<surface_model>
German INTJ exposes Citation Surfaces only, and the application injects the
Citation discriminator. Return surface with exactly spelling and
surfaceFeatures.

Use spelling Canonical when the attested realization uses its ordinary
dictionary spelling. Use Variant for a licensed alternate realization:
expressive sound lengthening, expressive reduplication, or an independently
licensed written variant. These variants remain Standard occurrence evidence.
Deletion, transposition, or substitution that is not licensed expression is a
Typo; after repair, the Surface is Canonical.

surfaceFeatures is null unless this exact use is deliberately historical or
archaic, when it is { historicalStatus: "Archaic" }. Historical forms remain
Standard unless the attested characters also contain a genuine error. Current
expressive variants are not Archaic.
</surface_model>

<lemma_model>
lemma.canonicalForm is the dictionary identity of the same classified INTJ.
Map lengthening and reduplication to the unlengthened single identity. Map an
established written variant or repaired typo to its dictionary form. Preserve
the lexical capitalization of noun-origin identities such as Mensch or Mist.
Keep an acronymic INTJ such as OMG as its own identity; the exact codec has no
abbreviation or foreign feature, so never add either and never expand it.

lemma.coreFeatures contains exactly { partType: "Res" | null }.

Use partType Res only for a standalone answer or response interjection: ja,
nein, corrective doch, jawohl, and licensed response variants in answer
function. Expressive, emotive, greeting, hesitation, prompting, sound-effect,
and secondary interjections use null. Context owns the function: do not copy Res
from an unmarked response word, and do not remove Res merely because another
occurrence of the same spelling is a modal particle.
</lemma_model>

<route_distinctions>
- A nearby multiword greeting, farewell, or other DiscourseFormula does not
  absorb the authoritative singleton INTJ.
- An unmarked modal PART such as ja does not change a separately supplied ja
  answer, and a supplied answer remains Res.
- An unmarked ADV such as nun does not change a supplied prompting INTJ.
- A sound imitation such as wupp, miau, or peng is resolved here when the
  supplied occurrence was classified as an independent INTJ.
- A noun-origin form such as Mensch or Mist keeps lexical uppercase when used as
  a secondary INTJ; an unmarked ordinary noun elsewhere does not control it.
</route_distinctions>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface: {
    spelling: "Canonical" | "Variant",
    surfaceFeatures: null | { historicalStatus: "Archaic" | null }
  },
  lemma: {
    canonicalForm: string,
    coreFeatures: { partType: "Res" | null }
  }
}

Never return decision, resolution, Unresolved, surfaceKind,
realizationCoverage, normalizedSurface, language, family, kind, Lemma linkage,
target indices, confidence, alternatives, or explanation.
</output_contract>

<final_checks>
- Both arrays have exactly members.length entries in source order.
- Only Typo members are repaired; licensed lengthening and reduplication remain
  Standard Variant evidence.
- Reduplicated members remain separate and ordered while canonicalForm names
  the single base identity.
- Res appears only for an actual answer or response occurrence.
- Surface contains exactly spelling and surfaceFeatures; Lemma Core Features
  contain exactly partType.
- Output has exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-intj-demo-pfui-expressive",
	"grammar-de-intj-demo-ja-response",
	"grammar-de-intj-demo-hmm-lengthened",
	"grammar-de-intj-demo-ha-ha-reduplication",
	"grammar-de-intj-demo-typo-huraa",
	"grammar-de-intj-demo-archaic-juchhei",
	"grammar-de-intj-demo-contextual-ach-after-noun",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/interjection",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
