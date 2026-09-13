import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Construction/Fusion
occurrence. Return its Citation Surface and Lemma. Do not classify the target or
reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. The sole TARGET
span and sole members entry are two authoritative projections of the same
written fused word. The caller already proved that the member is a valid
Construction/Fusion in this context.

Always resolve it. Never reject, repair, add, remove, merge, split, or reorder
membership. In particular, never split a fused word into hidden preposition and
article members, and never absorb a following article, noun, complement, Idiom
word, or other unmarked material. Other fused-looking forms, standalone ADP or
DET words, route contrasts, and repeated spellings in unmarked context do not
change the supplied member.
</input_contract>

<route_contract>
The route is fixed as German Construction/Fusion. A Fusion is one written form
conventionally realizing a German preposition plus article, such as am, beim,
im, ins, vom, zum, zur, ans, aufs, fürs, ums, durchs, übers, hinterm, vorm, or
unterm. The fused member itself is the complete Construction. The operation is
total even when nearby context mentions a lexicalized lookalike, a separately
written preposition and article, a dialect form, or another route such as an
Idiom or multi-member Lexeme.
</route_contract>

<application_projection>
This route has Citation Surface only. The application injects German language,
Construction family, Fusion kind, empty Lemma Core Features, Citation
surfaceKind, Surface-to-Lemma linkage, normalized Surface, Full realization
coverage, and the successful result wrapper.

Never return decision, resolution, Unresolved, realizationCoverage,
surfaceKind, normalizedSurface, coreFeatures, language, family, kind, Lemma
linkage, target indices, confidence, candidates, sources, or explanation.
</application_projection>

<member_projection>
Return exactly one memberOrthographies and one normalizedMembers entry.
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. Typo means a genuine local
spelling or inappropriate-casing error.

For ordinary sentence-initial capitalization, lowercase normalizedMembers but
classify the member Standard: Im becomes im and Beim becomes beim. Repair only
genuine Typos inside the supplied member: zun in a context selecting zum becomes
normalized zum, and beimm becomes beim. Do not repair valid unmarked context.

Licensed historical apostrophe spellings such as für's and in's remain
unchanged in normalizedMembers, remain Standard, and use Surface spelling
Variant while lemma.canonicalForm gives current fürs or ins. A typo repair uses
Surface spelling Canonical, not Variant.
</member_projection>

<surface_and_lemma>
surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for an ordinary current fused form and Variant for a licensed spelling variant
of the same Fusion Lemma. surfaceFeatures is null unless the grammatical use of
the fused form itself is archaic; then use { historicalStatus: "Archaic" }.
Archaic wording or a historical source in unmarked context does not by itself
make a current Fusion use archaic.

lemma.canonicalForm is the conventional current fused spelling of the supplied
member, not its expanded preposition-plus-article paraphrase and not the larger
phrase. Thus Im maps to im, zun maps to zum, and historical für's maps to fürs.
</surface_and_lemma>

<output_contract>
Return exactly:
{
  memberOrthographies: [("Standard" | "Typo")],
  normalizedMembers: [string],
  surface: {
    spelling: "Canonical" | "Variant",
    surfaceFeatures: null | { historicalStatus: "Archaic" }
  },
  lemma: { canonicalForm: string }
}

Final check: both arrays have length one, preserve the supplied member only,
and the output contains no application-owned fields. Always resolve the fixed
route.
</output_contract>`;

const demonstrations = corpus.select([
	"grammar-de-fusion-demo-im-initial",
	"grammar-de-fusion-demo-zur-noun-control",
	"grammar-de-fusion-demo-zum-typo",
	"grammar-de-fusion-demo-fuers-historical-variant",
	"grammar-de-fusion-demo-am-near-route-controls",
	"grammar-de-fusion-demo-ins-near-idiom-and-dialect",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/construction/fusion",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
