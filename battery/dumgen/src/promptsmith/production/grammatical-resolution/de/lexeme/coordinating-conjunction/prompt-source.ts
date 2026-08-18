import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/CCONJ occurrence.
Return its attested Citation Surface and dictionary Lemma. Do not classify the
target or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }.
Every TARGET span marks one supplied member, and members repeats those exact
texts in source order. Both projections are authoritative. Never reject,
repair, add, remove, merge, split, or reorder membership.
</input_contract>

<route_contract>
Target Classification already established Lexeme/CCONJ. The operation is
total: always resolve the supplied occurrence. Ambiguous forms such as aber,
denn, doch, jedoch, als, and wie are CCONJ here; use the surrounding syntax only
to resolve their grammatical identity and features. Fixed correlating units
such as entweder … oder, weder … noch, sowohl … als, sowohl … als auch,
sowohl … wie, sowohl … wie auch, je … desto, je … umso, and je … je are one
CCONJ Lexeme each, with multiple ordered members. Do not reclassify the target
as SCONJ, ADV, or PART, and do not absorb unmarked context.

German CCONJ is uninflected. Every occurrence has a Citation Surface, including
ordinary contextual uses. The application injects Citation, German route
identity, Surface-to-Lemma linkage, normalized Surface, successful resolution,
and Full realization coverage. Do not return any of those fields.
</route_contract>

<member_projection>
Return one memberOrthographies entry and one normalizedMembers entry for every
supplied member. Standard includes canonical spelling, ordinary
sentence-initial capitalization, and licensed abbreviations or variants. Typo
is only a genuine spelling error.

For each Standard member, preserve its spelling except lowercase ordinary
sentence-initial capitalization. Repair only Typo members. Preserve licensed
abbreviations such as bzw rather than expanding them. Array position is the
alignment key.

When a sentence-initial abbreviation has its period immediately after the
closing TARGET tag, lowercase the supplied member itself and leave the unmarked
period outside normalizedMembers.
</member_projection>

<surface_and_lemma>
surface contains exactly spelling and surfaceFeatures. spelling is Variant for
a licensed abbreviation or spelling variant and Canonical otherwise.
surfaceFeatures is null unless the attested conjunction is archaic; then use
{ historicalStatus: "Archaic" }.

lemma.canonicalForm is the normalized unabbreviated dictionary form of the same
CCONJ. For a multi-member identity it names the whole unit, conventionally
showing open slots when useful, for example entweder … oder or je … desto.
lemma.coreFeatures contains exactly { conjType: "Comp" | null }. Use Comp only
when a single-member als or wie introduces the comparison complement. Ordinary
coordinators and the fixed correlating units listed above use null.
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
  lemma: {
    canonicalForm: string,
    coreFeatures: { conjType: "Comp" | null }
  }
}

Never return decision, resolution, Unresolved, realizationCoverage,
surfaceKind, inflectionalFeatures, normalizedSurface, language, family, kind,
Lemma linkage, target indices, confidence, candidates, or explanation.
</output_contract>`;

const demonstrations = corpus.select([
	"grammar-de-cconj-demo-ordinary-und",
	"grammar-de-cconj-demo-comparative-als",
	"grammar-de-cconj-demo-causal-denn",
	"grammar-de-cconj-demo-typo-udn",
	"grammar-de-cconj-demo-variant-bzw",
	"grammar-de-cconj-demo-archaic-allein",
	"grammar-de-cconj-demo-sowohl-als-auch",
	"grammar-de-cconj-demo-je-desto",
	"grammar-de-cconj-demo-entweder-typo",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
