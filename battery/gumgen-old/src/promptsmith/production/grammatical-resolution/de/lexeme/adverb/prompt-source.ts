import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/ADV occurrence.
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
Target Classification already established Lexeme/ADV and complete membership.
The operation is total: always resolve the supplied ADV occurrence. Context
distinguishes identity and grammatical features but never changes the route.

Do not reject a target because a homograph can be an adverbially used ADJ, PART,
ADP, or SCONJ elsewhere. Those route distinctions were fixed upstream. Fixed
correlating units such as einerseits … andererseits and teils … teils are one
ADV Lexeme with multiple ordered members. Clause structure and local syntax
identify the ADV reading: for example, locative da in a verb-second matrix
clause differs from subordinate SCONJ da, and a pronominal adverb such as davor
is not the ADP vor. Never move or split members to fit another route.

The application injects German route identity, Surface-to-Lemma linkage,
normalized Surface, successful resolution, and Full realization coverage. Do
not return those fields.
</fixed_route_contract>

<member_projection>
Return one memberOrthographies and one normalizedMembers value for each supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed abbreviations, and licensed historical variants. Typo
is only a genuine spelling or inappropriate-casing error.

Preserve each Standard member exactly except lowercase ordinary sentence-initial
capitalization. Repair only Typo members. Preserve morphology and source order;
never replace an attested degree Surface with its Lemma. A licensed Variant
Surface remains Standard occurrence evidence. Sentence-initial capitalization
must not survive in normalizedMembers when the same ADV is ordinarily lowercase
inside a sentence: for example, initial Heute projects to heute while remaining
Standard. Apply this lowercase projection independently of PronType and route
homography.
</member_projection>

<surface_kind>
Use Citation for an invariant ADV occurrence, including ordinary clause use,
not only a dictionary label. The ADV codec supports Inflection only when Degree
is non-null. Use Inflection exactly for an established graded form:

{ inflectionalFeatures: { degree: "Cmp" | "Pos" | "Sup" } }

Use Cmp for a comparative, Sup for a superlative, and Pos only when context
explicitly establishes the positive member of a degree contrast. Do not emit
Inflection with a null Degree. Preserve irregular paradigms: lieber is a Cmp
Surface of gern and öfter is a Cmp Surface of oft. A periphrastic superlative
such as am liebsten has two members when both are supplied.

Fixed correlating ADV Lexemes such as einerseits … andererseits and teils …
teils are invariant and therefore use Citation. Their repeated or separated
anchors remain distinct normalizedMembers in source order.

surface.spelling is Variant only for a licensed spelling variant or conventional
abbreviation such as bißchen or ca; use Canonical otherwise. surfaceFeatures is
null unless the attested use itself is archaic, when it is
{ historicalStatus: "Archaic" }. A licensed historical spelling can be Variant
without making the use archaic.
</surface_kind>

<lemma_model>
lemma.canonicalForm is the dictionary form of the same ADV. It may differ from
the contextual Surface because of degree, typo repair, abbreviation expansion,
or ordinary initial capitalization.

lemma.coreFeatures contains exactly:
{
  foreign: "Yes" | null,
  numType: "Card" | "Mult" | null,
  pronType: "Dem" | "Ind" | "Int" | "Neg" | "Rel" | null
}

These are grammatical classes, not free semantic labels. Use foreign Yes only
when the ADV Lemma itself is foreign in this German occurrence. Use numType Card
for a cardinal-quantity ADV and Mult for an occurrence-count ADV such as zweimal.
Follow the German ADV convention for compact digit-x identities: keep the
written digit-x form as canonicalForm and use Card; do not expand it to a
spelled-out multiplicative Lemma. Spelled-out occurrence-count identities
remain Mult.
Use pronType Dem for demonstrative pronominal adverbs such as damit or dafür;
Ind for indefinite forms such as genug, wenig, or viel; Int for interrogative
forms in questions such as warum or wo; Neg for negative proforms such as
keineswegs or nie; and Rel for a relative proform linked to an antecedent, such
as weshalb or wobei in a relative clause. Context determines Int versus Rel.

Use null when the established ADV identity does not carry the feature. Ordinary
temporal or locative ADV identities such as heute, gestern, hier, and draußen do
not acquire PronType merely from their meaning. Do not infer Card, Mult, or
Foreign from topic or broad semantics alone. Core Features belong to the Lemma
identity and therefore survive a typo, licensed Surface spelling variant,
abbreviation, casing change, or degree realization; never erase an established
feature merely because the Surface spelling differs from canonicalForm.
</lemma_model>

<route_distinctions>
- A lexical ADV remains ADV even where a homograph has a PART or conjunction use.
- A productive adverbial ADJ belongs to the fixed ADJ route; do not imitate ADJ
  agreement or position features on ADV.
- A complete pronominal ADV is not reanalyzed as an ADP plus another member.
- A verb-second ADV clause use is not reanalyzed as a clause-final SCONJ use.
- An ordinary ADV anchor is not expanded into a correlating Lexeme or given an
  unmarked partner.
</route_distinctions>

<output_contract>
Return exactly:
{
  memberOrthographies: ("Standard" | "Typo")[],
  normalizedMembers: string[],
  surface: CitationSurface | InflectionSurface,
  lemma: {
    canonicalForm: string,
    coreFeatures: {
      foreign: "Yes" | null,
      numType: "Card" | "Mult" | null,
      pronType: "Dem" | "Ind" | "Int" | "Neg" | "Rel" | null
    }
  }
}

CitationSurface contains exactly spelling, surfaceKind Citation, and
surfaceFeatures. InflectionSurface contains exactly spelling, surfaceKind
Inflection, surfaceFeatures, and the non-null Degree feature bag.

Never return decision, resolution, Unresolved, realizationCoverage,
normalizedSurface, language, family, kind, Lemma linkage, target indices,
confidence, candidates, or explanation.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in source order.
- Only Typo members are repaired; ordinary initial capitalization is Standard
  but must project to ordinary lowercase in normalizedMembers.
- Citation omits inflectionalFeatures; Inflection contains a non-null Degree.
- Lemma Core Features contain exactly foreign, numType, and pronType.
- Output has exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-adv-demo-temporal-heute",
	"grammar-de-adv-demo-demonstrative-dazu",
	"grammar-de-adv-demo-interrogative-warum",
	"grammar-de-adv-demo-comparative-lieber",
	"grammar-de-adv-demo-superlative-am-liebsten",
	"grammar-de-adv-demo-typo-gester",
	"grammar-de-adv-demo-einerseits-andererseits",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/adverb",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
