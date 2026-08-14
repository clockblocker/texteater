import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/PART occurrence.
Return its attested Citation Surface and dictionary Lemma. Do not classify the
target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied member, and members repeats those exact texts in source
order. Both projections are authoritative. Never reject, repair, add, remove,
merge, split, or reorder membership. Contextual words and punctuation are not
members unless supplied.
</input_contract>

<route_contract>
Target Classification already established Lexeme/PART. The operation is total:
always resolve the supplied occurrence. Use its context to determine the
particle's lexical and polarity features, but never return Unresolved or
reclassify it as ADV, ADP, INTJ, CCONJ, SCONJ, a Phraseme, or part of a VERB.
The fixed PART route remains authoritative for a contextually ambiguous form.

German PART is uninflected in the current codec. Every occurrence has a
Citation Surface. The application injects surfaceKind Citation, German route
identity, Surface-to-Lemma linkage, normalized Surface, successful resolution,
and realizationCoverage Full. Do not return those fields.
</route_contract>

<member_projection>
Return exactly one memberOrthographies and normalizedMembers entry per supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed regional or expressive variants, and conventional
abbreviations. Typo is only a genuine spelling or inappropriate-casing error.

Preserve a Standard member's characters except lowercase ordinary
sentence-initial capitalization. Repair only Typo members. A typo repair changes
normalizedMembers to the intended particle but does not change Surface spelling
from Canonical. A licensed variant remains unchanged and uses spelling Variant.
Never replace a particle with a synonym. Lexical identity follows explicit
lexicographic cues: “variant of X” selects Lemma X and spelling Variant, while
“own Lemma/headword/entry” selects the attested form as canonicalForm and
spelling Canonical. Without an explicit relation, do not invent a modern-Lemma
link merely because a regional or historical form resembles another particle;
preserve the supplied lexeme as its own canonicalForm. If abbreviation
punctuation sits outside TARGET, do not add it to normalizedMembers; the
dictionary Lemma may still include the punctuation.
</member_projection>

<surface_model>
surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for the Lemma's ordinary form and for a repaired typo. Use Variant only for an
independently licensed regional, expressive, historical, or abbreviated Surface
of the chosen Lemma. surfaceFeatures is null unless this exact occurrence is
explicitly historical or archaic; then use { historicalStatus: "Archaic" }.
Do not mark a merely colloquial or foreign form archaic.
</surface_model>

<lemma_model>
lemma.canonicalForm is the complete normalized dictionary form of this PART.
Ordinary capitalization does not affect it. A typo resolves to the intended
particle Lemma. A licensed regional or historical form preserves a distinct
dictionary identity unless the context explicitly calls it a variant of a
named standard Lemma. An explicit variant-of cue uses that named Lemma; an
explicit own-entry cue keeps the attested form as the Lemma. An abbreviation
retains its conventional punctuated dictionary form.

lemma.coreFeatures contains exactly:
{
  abbr: "Yes" | null,
  foreign: "Yes" | null,
  partType: "Inf" | null,
  polarity: "Neg" | "Pos" | null
}

Use partType Inf only for infinitival zu. Do not invent modal, focus, degree,
answer, or verb-particle PartType values; the codec does not expose them.
Use polarity Neg for a lexically negative particle such as clause-negating
nicht and an established negative answer particle. Use polarity Pos for an
explicitly affirmative answer particle, including doch that contradicts a
negative question. Modal ja and modal doch express stance rather than an answer,
so their polarity is null. Modal, focus, and intensifying particles otherwise
have partType and polarity null.

foreign is Yes only for an overt source-language particle used in the German
context; preserve its source-language canonicalForm. Its ordinary unchanged
source-language spelling is Canonical relative to that foreign Lemma, never
Variant merely because it is foreign to German. abbr is Yes only for an
established or explicitly identified abbreviation, not for a typo or colloquial
shortening. An abbreviation is itself the Lemma identity: retain its complete
conventional abbreviation, including punctuation outside TARGET, and never
expand canonicalForm to the unabbreviated word. Every unsupported field is
null, and all four keys are mandatory.
</lemma_model>

<route_distinctions>
- Clause-dependent modal ja is PART with null polarity; an explicitly supplied
  affirmative answer ja is PART with Pos under this already-fixed route.
- Infinitival zu is PART with PartType Inf; an unmarked prepositional zu remains
  ADP context.
- A supplied modal or focus homograph remains PART even beside an unmarked ADV,
  CCONJ, SCONJ, INTJ, or ADP.
- A nearby separable VERB element never enters PART membership. Only the
  supplied target is resolved.
- A punctuation mark outside TARGET is not a member. Never absorb surrounding
  phraseme or clause material.
</route_distinctions>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface: {
    spelling: "Canonical" | "Variant",
    surfaceFeatures: null | { historicalStatus: "Archaic" }
  },
  lemma: {
    canonicalForm: string,
    coreFeatures: {
      abbr: "Yes" | null,
      foreign: "Yes" | null,
      partType: "Inf" | null,
      polarity: "Neg" | "Pos" | null
    }
  }
}

Never return decision, resolution, Unresolved, realizationCoverage, surfaceKind,
inflectionalFeatures, normalizedSurface, language, family, kind, Lemma linkage,
target indices, confidence, candidates, or explanation.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in source order.
- Only Typo members are repaired; ordinary initial capitalization is Standard.
- Citation-only surface has no surfaceKind or inflectional features.
- All four nullable Core Feature keys are present.
- Output contains exactly memberOrthographies, normalizedMembers, surface, lemma.
</final_checks>`;

export const demonstrations = corpus.select([
	"grammar-de-part-demo-negative-nicht",
	"grammar-de-part-demo-infinitival-zu",
	"grammar-de-part-demo-modal-halt",
	"grammar-de-part-demo-focus-sogar",
	"grammar-de-part-demo-typo-ebn",
	"grammar-de-part-demo-archaic-nit",
	"grammar-de-part-demo-distinct-archaic-ni",
	"grammar-de-part-demo-foreign-yes",
	"grammar-de-part-demo-abbreviation-aff",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
