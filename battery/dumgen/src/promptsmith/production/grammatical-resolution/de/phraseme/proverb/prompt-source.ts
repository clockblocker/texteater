import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve one already-classified German Phraseme/Proverb occurrence to its
Citation Surface and Lemma grammar. The operation is total: always resolve the
supplied target.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied Proverb member, and members repeats those exact texts in
source order. Both projections are authoritative. The caller has already
proved the route, occurrence, and complete realized membership.

Never reject, repair, add, remove, merge, split, reorder, or reclassify
membership. Attributions, discourse framing, quotation marks, internal and
terminal punctuation, modifiers, and nearby expressions outside TARGET are
context only. Return exactly one memberOrthographies and one normalizedMembers
entry for every supplied member, including repeated or discontinuous members.
</input_contract>

<route_contract>
The route is fixed as German Phraseme/Proverb. Do not decide again whether the
wording is an established traditional saying. Lack of recognition, provenance,
or independent attestation is irrelevant to Grammatical Resolution.

Unmarked context may mention or quote an Aphorism, Idiom, DiscourseFormula,
slogan, arbitrary quotation, or ordinary generic or episodic statement. Such
route contrasts, literal reuse, authors, speakers, and editorial framing do not
alter the marked Proverb target and never enter the output arrays.
</route_contract>

<application_projection>
This Dumling route has Citation Surface only. The application injects German
language, Phraseme family, Proverb kind, empty Lemma Core Features, Citation
surfaceKind, Surface-to-Lemma linkage, normalized Surface, and the successful
result.

Return no decision or resolution wrapper. Never return Unresolved, language,
family, kind, coreFeatures, surfaceKind, normalizedSurface, a linked Lemma
inside Surface, indices, confidence, candidates, sources, provenance, or
explanation.
</application_projection>

<wording_and_members>
normalizedMembers contains only normalized supplied words in source order.
Punctuation is never a member and never appears in normalizedMembers or
canonicalForm. Preserve every repeated position. Unmarked reporting clauses or
parentheticals may interrupt one Proverb citation but remain context.

lemma.canonicalForm is the complete current conventional wording with words
joined by single spaces, appropriate sentence-initial and German noun
capitalization, and no punctuation. For Full coverage with Canonical spelling,
canonicalForm is exactly normalizedMembers joined by single spaces. Never
absorb unmarked context or silently replace, delete, or insert lexical
components. A shortened or component-replaced saying is its own canonical
wording unless the supplied occurrence is explicitly Partial or a licensed
orthographic Variant.

Serialize every Full or Partial canonicalForm as lexical members separated by
single spaces. Before returning, remove every comma, period, semicolon, colon,
dash, quotation mark, ellipsis, and other punctuation separator. Conventional
punctuation visible in normal Proverb writing belongs to context, never to this
field.
</wording_and_members>

<coverage>
realizationCoverage is Full when the occurrence realizes all entity-owned
lexical material. Use Partial only when fixed lexical material is genuinely
unrealized and the exact full Proverb remains recoverable, normally from an
explicit ellipsis or broken-off quotation. Return only realized supplied
members in normalizedMembers and the complete wording in canonicalForm.

Partial never repairs membership. It cannot excuse a present but unmarked word,
delete a supplied member, join two units, or turn a lexical substitution into
the preferred saying. Without an explicit ellipsis or broken-off signal, an
unbroken supplied Proverb is Full.
</coverage>

<orthography_and_surface>
Standard means exact conventional spelling, ordinary sentence-initial
capitalization, or a licensed historical spelling. Typo means a genuine
selected-member spelling or casing error. Repair only Typo positions in
normalizedMembers and canonicalForm. A lowercase first word at the beginning
of a complete written Proverb is an inappropriate-casing Typo and normalizes to
uppercase. Preserve required German noun capitalization everywhere.

Fixed proverbial wording may preserve conventional contractions, apocope, or
older morphology that ordinary free prose would expand. Such a conventional
member is Standard and stays unchanged in normalizedMembers. Do not label it
Typo or modernize it merely because a longer free-sentence form also exists;
mark Typo only for an actual spelling or casing error in this Proverb wording.

surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for current wording and Typo repair. Use Variant for a licensed orthographic
form of the same lexical wording; preserve its attested licensed spelling in
normalizedMembers and map to current spelling in canonicalForm.
surfaceFeatures is null unless the grammatical use itself is archaic, then
return { historicalStatus: "Archaic" }. Historical spelling alone does not
make the use archaic.
</orthography_and_surface>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  realizationCoverage: "Full" | "Partial",
  surface: {
    spelling: "Canonical" | "Variant",
    surfaceFeatures: null | { historicalStatus: "Archaic" }
  },
  lemma: { canonicalForm: string }
}

Final check: both arrays equal members.length, preserve all positions in source
order, and contain only supplied members. Always resolve the classified target.
</output_contract>`;

export const demonstrations = corpus.select([
	"grammar-de-proverb-demo-morgenstund-attribution",
	"grammar-de-proverb-demo-aller-anfang-typo",
	"grammar-de-proverb-demo-was-heute-punctuation",
	"grammar-de-proverb-demo-grube-partial",
	"grammar-de-proverb-demo-muss-historical-variant",
	"grammar-de-proverb-demo-wo-gehobelt-discontinuous",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/proverb",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
