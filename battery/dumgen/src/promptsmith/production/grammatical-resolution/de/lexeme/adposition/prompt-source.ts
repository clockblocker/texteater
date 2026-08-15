import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/ADP occurrence. Return its attested Citation Surface and dictionary Lemma. Do not classify the target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span marks one supplied member, and members repeats those exact texts in source order. Both projections are authoritative. Never reject, repair, add, remove, merge, split, or reorder membership. Complements and other contextual words are not members unless supplied.
</input_contract>

<route_contract>
Target Classification already established Lexeme/ADP. The operation is total: always resolve the supplied occurrence. Use syntax to distinguish a preposition, postposition, or circumposition and its lexical features, but never reclassify it as ADV, SCONJ, a Fusion, or part of a VERB target. An unmarked homograph elsewhere in the sentence does not change the supplied target.

German ADP is uninflected in the current codec. Every occurrence has a Citation Surface, including ordinary sentence uses. The application injects surfaceKind Citation, German route identity, Surface-to-Lemma linkage, normalized Surface, successful resolution, and Full realization coverage. Do not return those fields.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every supplied member. Standard includes canonical spelling, ordinary sentence-initial capitalization, licensed variants, and conventional abbreviations. Typo is only a genuine spelling or inappropriate-casing error.

For each Standard member, preserve its characters except lowercase ordinary sentence-initial capitalization. Capitalization is Standard only when ordinary German orthography licenses it at that position; an otherwise lowercase preposition capitalized in the middle of a sentence is Typo. Repair only Typo members. Preserve member order and separate members; never absorb a nominal complement. A circumposition such as von ... an has two supplied and two normalized members. A licensed multiword variant such as auf Grund also retains both positions.

Punctuation is not a ResolvableText member. When an abbreviation period follows the closing TARGET tag, preserve the supplied letters without adding the period to normalizedMembers; the Lemma may still use the conventional punctuated abbreviation.
</member_projection>

<surface_model>
surface contains exactly spelling and surfaceFeatures. spelling is Variant when the attested Surface is a licensed abbreviation or independently established spelling variant of the chosen Lemma; otherwise Canonical. If punctuation outside TARGET completes an abbreviation whose dictionary form includes that punctuation, the unpunctuated supplied Surface is still Variant relative to that Lemma. Equal standard variants do not by themselves choose one Lemma headword, but an explicit dictionary-form or preferred-headword cue in the context does. surfaceFeatures is null unless this ADP use is archaic; then use { historicalStatus: "Archaic" }.
</surface_model>

<lemma_model>
lemma.canonicalForm is the complete normalized dictionary form of this ADP. For a circumposition, use source-order gap notation such as von ... an or um ... willen. For a conventional abbreviation, retain its dictionary abbreviation such as inkl.; do not expand it to a synonym.

lemma.coreFeatures contains exactly:
{
  abbr: "Yes" | null,
  adpType: "Circ" | "Post" | "Prep" | null,
  extPos: "ADV" | "SCONJ" | null,
  foreign: "Yes" | null,
  governedCase: "Acc" | "Dat" | "Gen" | "Nom" | null,
  partType: "Vbp" | null
}

adpType describes this occurrence: Prep precedes its complement, Post follows it, and Circ has supplied members on both sides. governedCase is the lexical government of this occurrence's construction. Use the complement's form to distinguish position-specific government, and use lexical valency when the complement does not visibly mark case. A clausal complement has no nominal governed case, so use null even when the same lemma governs a case in nominal use. Use null for two-way prepositions such as auf, vor, and zwischen, and for an adposition such as dank whose licensed government cannot fit one scalar value. Otherwise retain the established governed case rather than defaulting to null. Colloquial local dative after wegen does not erase its canonical genitive government.

extPos describes established external behavior while lexical identity remains ADP; for example anstatt before a dass clause may use SCONJ. foreign is Yes only for an established foreign ADP lemma, not merely unfamiliar spelling. abbr is Yes only for an established abbreviation. partType is Vbp only when the route-valid supplied ADP itself is identified as a separated verb particle; do not copy it from an unmarked homograph or from material belonging to a VERB target. Use null for every unsupported feature.
</lemma_model>

<route_distinctions>
- Resolve only the supplied ADP members; never absorb the complement.
- A later unmarked separable particle does not turn an earlier supplied auf into Vbp.
- A governed preposition that belongs to an unmarked VERB target does not enter this ADP output.
- An unmarked Fusion such as im and an unmarked SCONJ remain context only.
- Fixed ADP classification is authoritative even when a form such as entlang, anstatt, or auf has other possible routes elsewhere.
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
      adpType: "Circ" | "Post" | "Prep" | null,
      extPos: "ADV" | "SCONJ" | null,
      foreign: "Yes" | null,
      governedCase: "Acc" | "Dat" | "Gen" | "Nom" | null,
      partType: "Vbp" | null
    }
  }
}

Never return decision, resolution, Unresolved, realizationCoverage, surfaceKind, inflectionalFeatures, normalizedSurface, language, family, kind, Lemma linkage, target indices, confidence, candidates, or explanation.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in the same order.
- Only Typo members are repaired; ordinary initial capitalization is Standard.
- Citation-only surface has no surfaceKind or inflectionalFeatures in model output.
- All six nullable Core Feature keys are present.
- Output contains exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-adp-demo-prep-mit-dat",
	"grammar-de-adp-demo-two-way-auf",
	"grammar-de-adp-demo-post-entlang-acc",
	"grammar-de-adp-demo-circ-von-an",
	"grammar-de-adp-demo-typo-one",
	"grammar-de-adp-demo-archaic-ob",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
