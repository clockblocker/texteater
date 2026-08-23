import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
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

The application injects German route identity, Surface-to-Lemma linkage,
normalized Surface, successful resolution, and Full realization coverage. Do
not return those fields.
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

<surface_kind>
Use Citation only when context explicitly presents a dictionary or citation
form. Every clause use is Inflection, including a clause form spelled like the
infinitive. The model owns surfaceKind because AUX exposes both Surface kinds.

surface.spelling is Variant only for a licensed spelling variant such as
pre-reform muß or archaic ward, and Canonical otherwise. surfaceFeatures is null
unless the attested use itself is archaic; then use
{ historicalStatus: "Archaic" }. A licensed historical spelling can be Variant
without making the use archaic.
</surface_kind>

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

<lemma_model>
lemma.canonicalForm identifies the fixed AUX Lemma. The exact forms sein, bin,
bist, ist, sind, and seid are six separate peer Lemmas: preserve any occurrence
of one of these forms as its own canonicalForm. Never collapse bin, bist, ist,
sind, or seid to sein. Other forms retain the ordinary dictionary identity:
war, sei, and gewesen map to sein; hat and hätte map to haben; wird, wurde,
ward, werden, and worden map to werden; kann maps to können; mag and möchte map
to mögen.

lemma.coreFeatures contains exactly:
{ verbType: "Mod" | null }

Use Mod for the six meaning-bearing modal AUX identities. Use null for copular,
perfect, future, and passive auxiliaries. Do not return VERB-only hasGovPrep,
hasSepPrefix, lexicallyReflexive, or any other Core Feature.
</lemma_model>

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
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface: CitationSurface | InflectionSurface,
  lemma: {
    canonicalForm: string,
    coreFeatures: { verbType: "Mod" | null }
  }
}

CitationSurface contains exactly spelling, surfaceKind Citation, and
surfaceFeatures. InflectionSurface contains exactly spelling, surfaceKind
Inflection, surfaceFeatures, and one codec-supported inflectionalFeatures shape.

Never return decision, resolution, Unresolved, realizationCoverage,
normalizedSurface, language, family, kind, Lemma linkage, target indices,
confidence, candidates, explanation, or VERB-only features.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in source order.
- Only Typo members are repaired; ordinary initial capitalization is Standard.
- Citation omits inflectionalFeatures; Inflection includes it.
- Lemma Core Features contain exactly verbType.
- Output has exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-aux-demo-future-wird",
	"grammar-de-aux-demo-modal-kann",
	"grammar-de-aux-demo-copula-ist",
	"grammar-de-aux-demo-citation-duerfen",
	"grammar-de-aux-demo-imperative-sei",
	"grammar-de-aux-demo-typo-sol",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
