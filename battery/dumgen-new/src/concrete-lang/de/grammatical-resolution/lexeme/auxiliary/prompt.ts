import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/AUX"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/AUX occurrence.
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
Target Classification already established Lexeme/AUX and complete membership.
The operation is total: always resolve the supplied AUX occurrence. Context
distinguishes the grammatical identity and features of the marked member, but
never changes its route.

Valid fixed-route AUX uses include meaning-bearing modal dürfen, können, mögen,
müssen, sollen, and wollen; copular sein; perfect-forming haben and sein;
future-forming werden; and passive-forming werden. A sentence may contain an
unmarked lexical-VERB homograph as contrast. Resolve only the marked AUX.
</fixed_route_contract>

<member_projection>
Return one memberOrthographies and one normalizedMembers value for each supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, and licensed historical variants. Typo is only a genuine
spelling or inappropriate-casing error.

Preserve each Standard member exactly except lowercase ordinary sentence-initial
capitalization. Repair only Typo members. Preserve morphology and member order;
never replace a finite, infinitive, or participial Surface with its Lemma.
</member_projection>

<surface_inflection>
Use null inflectionalFeatures only when context explicitly presents a dictionary or citation
form. Every clause use has marked inflectionalFeatures, including a clause form spelled like the
infinitive.

surface.spelling is Variant only for a licensed spelling variant such as
pre-reform muß or archaic ward, and Canonical otherwise. surfaceFeatures is null
unless the attested use itself is archaic; then use
{ historicalStatus: "Archaic" }. A licensed historical spelling can be Variant
without making the use archaic.
</surface_inflection>

<finite_inflection>
For an ordinary finite indicative or subjunctive use, emit:
{
  mood: "Ind" | "Sub" | null,
  number: "Plur" | "Sing" | null,
  person: "1" | "2" | "3" | null,
  tense: "Past" | "Pres" | null,
  verbForm: "Fin",
  voice: "Pass" | null
}

Fill only features established by form and context. Use null for genuine
syncretism or damaged context. Konjunktiv I uses tense Pres; Konjunktiv II uses
tense Past. In present-day modal use, möchte is the Konjunktiv-II form of mögen:
use mood Sub and tense Past, not indicative present. A form such as wir sollen
is syncretic between indicative and subjunctive; if a damaged fragment provides
no disambiguating syntax or report context, use mood null rather than guessing
Ind or Sub. Null mood does not erase other evidence: an overt subject such as
wir still establishes person 1 and number Plur independently. For an imperative
use:
{
  mood: "Imp",
  number: "Plur" | "Sing" | null,
  person: "1" | "2" | "3" | null,
  tense: null,
  verbForm: "Fin",
  voice: "Pass" | null
}
</finite_inflection>

<nonfinite_inflection>
For an infinitive use:
{
  mood: null,
  number: "Plur" | "Sing" | null,
  person: null,
  tense: null,
  verbForm: "Inf",
  voice: "Pass" | null
}

For a participial use:
{
  aspect: "Perf" | null,
  gender: "Fem" | "Masc" | "Neut" | null,
  mood: null,
  number: "Plur" | "Sing" | null,
  person: null,
  tense: "Past" | "Pres" | null,
  verbForm: "Part",
  voice: "Pass" | null
}

Ordinary German AUX infinitives and participles have null agreement. Do not
infer Aspect Perf or Tense merely from Partizip II shape. The codec also admits
a compatibility feature bag with verbForm null and at least one of number,
tense, or voice non-null. Use it only when the representation genuinely
establishes such a feature but does not establish Fin, Inf, or Part; never use
it for a normal identifiable German verb form.
</nonfinite_inflection>

<voice_policy>
Voice belongs to the marked AUX Surface. Use Pass when werden itself forms the
passive, including finite wird or wurde, passive infinitive werden, and passive
participle worden. Future-forming werden uses voice null. Perfect-forming haben
or sein, copular sein, and meaning-bearing modals use voice null even when
unmarked context contains another passive complex.
</voice_policy>

<route_distinctions>
- A marked modal AUX governing a bare infinitive remains AUX; the infinitive is
  context, not a member.
- A marked copula remains AUX; its adjective or nominal predicate is context.
- A marked perfect, future, or passive auxiliary is resolved from its own form;
  do not copy morphology from the unmarked lexical verb.
- An unmarked possession haben, lexical werden, or nominal-object mögen is only
  contrastive context and does not alter the marked AUX.
</route_distinctions>

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
		"grammar-de-aux-demo-future-wird",
		"grammar-de-aux-demo-modal-kann",
		"grammar-de-aux-demo-copula-ist",
		"grammar-de-aux-demo-citation-duerfen",
		"grammar-de-aux-demo-imperative-sei",
		"grammar-de-aux-demo-typo-sol",
	],
	source: import.meta.url,
});
