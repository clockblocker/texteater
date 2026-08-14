import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/SCONJ occurrence.
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
Target Classification already established Lexeme/SCONJ and complete membership.
The operation is total: always resolve the supplied occurrence. Context
distinguishes identity, comparative function, orthography, and historical
status, but never changes the route.

Do not return Unresolved because an identical spelling can be CCONJ, ADV, ADP,
PART, or part of a PairedFrame in a different occurrence. Unmarked neighbors
remain outside the target. Keep every supplied member of a multi-member
subordinator, but never absorb unmarked clause material.

The application injects German route identity, Citation surfaceKind,
Surface-to-Lemma linkage, normalized Surface, successful resolution, and Full
realization coverage. Do not return those fields.
</fixed_route_contract>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry per
supplied member. Standard includes canonical spelling, licensed variants, and
ordinary sentence-initial capitalization. Typo is only a genuine spelling or
inappropriate-casing error.

Preserve Standard members exactly except lowercase ordinary initial
capitalization of a normally lowercase conjunction. Preserve licensed
historical spellings such as daß rather than replacing them with the Lemma
canonicalForm. Repair only Typo members. Never substitute a synonym or change
the supplied member count or order.
</member_projection>

<surface_model>
German SCONJ exposes Citation Surfaces only, and the application injects the
Citation discriminator. Return surface with exactly spelling and
surfaceFeatures.

Use spelling Canonical for the ordinary dictionary spelling. Use Variant for a
licensed alternate realization, including an established historical spelling
or separately written variant of a lexicalized multi-member identity. A real
misspelling is Typo; after repair, the Surface is Canonical.

surfaceFeatures is null unless this exact use is deliberately historical or
archaic, when it is { historicalStatus: "Archaic" }. Historical forms remain
Standard unless their attested characters also contain a genuine error.
</surface_model>

<lemma_model>
lemma.canonicalForm is the dictionary identity of the same classified SCONJ.
Map repaired typos and licensed variants to that identity. For an authoritative
multi-member target, use the lexical identity expressed by all members in
source order.

lemma.coreFeatures contains exactly { conjType: "Comp" | null }.

Use conjType Comp only when the SCONJ introduces a comparing subordinate clause
or an established reduced comparing clause, as with comparative als, wie, or
als ob. Temporal als and ordinary causal, conditional, concessive, purpose,
consecutive, modal, complement, and interrogative subordinators use null.
Context owns the function; spelling alone never licenses Comp.
</lemma_model>

<route_distinctions>
- Finite, infinitival, and established reduced subordinate clauses remain valid
  SCONJ contexts when upstream classification and membership are supplied.
- Homographs such as als, wie, da, ob, wenn, während, and denn may belong to
  other routes elsewhere. Do not reconsider the supplied SCONJ occurrence.
- A nearby CCONJ denn, adpositional während, adverbial da, modal particle ja,
  or PairedFrame is merely unmarked context and does not alter the target.
- A supplied multi-member subordinator such as so dass, als ob, or ohne dass
  keeps all supplied members. Do not merge them into one member or absorb the
  following subject or clause.
- The exact SCONJ codec has no abbreviation feature. Never invent one or expand
  an unmarked abbreviation in the surrounding sentence.
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
    coreFeatures: { conjType: "Comp" | null }
  }
}

Never return decision, resolution, Unresolved, surfaceKind,
realizationCoverage, normalizedSurface, language, family, kind, Lemma linkage,
target indices, confidence, alternatives, or explanation.
</output_contract>

<final_checks>
- Both arrays have exactly members.length entries in source order.
- Only Typo members are repaired; licensed historical spellings remain
  Standard Variant evidence.
- Multi-member targets remain separate and ordered.
- Comp appears only for an actual comparing subordinate-clause use.
- Surface contains exactly spelling and surfaceFeatures; Lemma Core Features
  contain exactly conjType.
- Output has exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

export const demonstrations = corpus.select([
	"grammar-de-sconj-demo-finite-weil",
	"grammar-de-sconj-demo-reduced-wie",
	"grammar-de-sconj-demo-infinitival-um",
	"grammar-de-sconj-demo-causal-da",
	"grammar-de-sconj-demo-typo-obwol",
	"grammar-de-sconj-demo-historical-dass",
	"grammar-de-sconj-demo-multiword-so-dass",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
