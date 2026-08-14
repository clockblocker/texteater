import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Construction/PairedFrame
occurrence. Return its Citation Surface and Lemma. Do not classify the target or
reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied anchor, and members repeats those exact texts in source
order. Both projections are authoritative. The caller already proved that all
and only the anchors of one valid frame are present.

Never reject, repair, add, remove, merge, split, or reorder membership. Never
absorb comparative words, degree expressions, predicates, infinitives,
conjuncts, arguments, or other payload from unmarked context. Return one
memberOrthographies and one normalizedMembers entry per supplied member.
</input_contract>

<route_contract>
The route is fixed as German Construction/PairedFrame and the operation is
total: always resolve it. PairedFrame members are the small closed-class
correlating anchors; the open material organized by them remains context.

Valid frames include two-anchor forms such as entweder … oder, weder … noch,
je … desto, je … umso, einerseits … andererseits, teils … teils, so … dass,
um … zu, ohne … zu, anstatt … zu, and statt … zu, plus three-anchor forms such as
sowohl … als auch and sowohl … wie auch. The independently licensed
sowohl … wie form has two anchors. Other valid classified frames follow the
same anchor-only rule.

The same spellings can appear nearby as standalone CCONJ, SCONJ, ADV, ADP, or
PART occurrences. Those unmarked occurrences are context only. Repeated
anchor spellings such as teils … teils occupy two positions and must remain two
entries.
</route_contract>

<application_projection>
This route has Citation Surface only. The application injects German language,
Construction family, PairedFrame kind, empty Lemma Core Features, Citation
surfaceKind, Surface-to-Lemma linkage, normalized Surface, Full realization
coverage, and the successful result wrapper.

Never return decision, resolution, Unresolved, realizationCoverage,
surfaceKind, normalizedSurface, coreFeatures, language, family, kind, Lemma
linkage, target indices, confidence, candidates, sources, or explanation.
</application_projection>

<member_projection>
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. Typo means a genuine
spelling or inappropriate-casing error. Apply casing mechanically: when the
first supplied anchor is capitalized only because it begins the sentence,
return its conventional lowercase anchor in normalizedMembers but classify it
Standard. Thus source Entweder and Je become normalized entweder and je. This
lowercasing is not a Typo repair. Repair only Typo members. Preserve every
member position and source order.

A licensed historical anchor stays unchanged in normalizedMembers and remains
Standard. Use Surface spelling Variant when it is an orthographic realization
of a current anchor, for example old daß for current dass. A typo repair uses
Surface spelling Canonical, not Variant.
</member_projection>

<surface_and_lemma>
surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for the ordinary current anchor inventory and Variant for a licensed
orthographic variant of that same Lemma. surfaceFeatures is null unless the
attested grammatical use itself is archaic; then return
{ historicalStatus: "Archaic" }.

lemma.canonicalForm names the complete frame in current spelling and canonical
anchor order. Join its anchor groups with a spaced ellipsis, for example
entweder … oder, sowohl … als auch, or je … umso. It is not normalizedMembers:
the Surface array stays in source order and contains no ellipsis.

Lexical anchor substitutions or different anchor counts create distinct
Lemmas, not spelling Variants. Thus je … desto differs from je … umso;
sowohl … als auch, sowohl … wie, and sowohl … wie auch are distinct; anstatt …
zu differs from statt … zu. A historical orthographic anchor maps to the
current spelling in canonicalForm, and a Typo maps to its repaired anchor.
</surface_and_lemma>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface: {
    spelling: "Canonical" | "Variant",
    surfaceFeatures: null | { historicalStatus: "Archaic" }
  },
  lemma: { canonicalForm: string }
}

Final check: both arrays equal members.length, preserve all positions in source
order, and contain anchors only. Always resolve the classified target.
</output_contract>`;

export const demonstrations = corpus.select([
	"grammar-de-paired-frame-demo-anstatt-zu",
	"grammar-de-paired-frame-demo-sowohl-als-auch",
	"grammar-de-paired-frame-demo-je-desto-payload",
	"grammar-de-paired-frame-demo-entweder-typo",
	"grammar-de-paired-frame-demo-so-dass-variant",
	"grammar-de-paired-frame-demo-einerseits-andererseits",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/construction/paired-frame",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
