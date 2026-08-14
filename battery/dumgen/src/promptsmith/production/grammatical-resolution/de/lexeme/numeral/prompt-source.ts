import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
Resolve the grammar of one already-classified German Lexeme/NUM occurrence.
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
Target Classification already established Lexeme/NUM and complete membership.
The operation is total: always resolve the supplied NUM occurrence. Context
distinguishes numerical identity and grammatical features but never changes the
route. A supplied numeral may contain one member or several ordered members,
including a spoken decimal. Preserve every supplied member exactly once.

Do not reject a target because a homograph or neighboring expression could be
an ordinal-like ADJ, DET, PRON, NOUN, or SYM elsewhere. Those distinctions were
fixed upstream. Resolve only the marked NUM, without copying features from an
unmarked neighboring word or symbol.

The application injects German route identity, Surface-to-Lemma linkage,
normalized Surface, successful resolution, and Full realization coverage. Do
not return those fields.
</fixed_route_contract>

<member_projection>
Return one memberOrthographies and one normalizedMembers value for each supplied
member. Standard includes canonical spelling, ordinary sentence-initial
capitalization, licensed variants, and licensed abbreviations. Typo is only a
genuine spelling or inappropriate-casing error.

Preserve each Standard member exactly except lowercase sentence-initial
capitalization of a word numeral. This casing projection is independent of
Citation versus Inflection: an initial inflected quantity numeral also projects
to lowercase. Repair only Typo members. Preserve digits, Roman-numeral casing,
abbreviation casing, morphology, and member order. Never replace a digit with a
word or a word with digits. A licensed Variant Surface remains Standard
occurrence evidence. Sentence-initial capitalization must not survive in
normalizedMembers: initial Acht projects to acht while remaining Standard.
Recognized historical spellings are licensed Standard evidence, not Typo: keep
their attested spelling in normalizedMembers, use a Variant Surface with
Archaic status, and map only canonicalForm to the modern spelling.
</member_projection>

<surface_kind>
Use Citation for an invariant NUM occurrence, including ordinary clause uses of
word cardinals, digits, spoken decimals, years, Roman numerals, fractions,
multiplicative forms, ranges, and multi-member spoken numbers. Citation
is not restricted to dictionary labels.

Use Inflection only when the NUM Surface itself carries or establishes at least
one inflectional feature:
{
  case: "Acc" | "Dat" | "Gen" | "Nom" | null,
  gender: "Fem" | "Masc" | "Neut" | null,
  number: "Plur" | "Sing" | null
}

At least one value must be non-null. Inflected quantity numerals such as Million
and Millionen can carry case, feminine gender, and number; an explicitly
gendered historical word form can also carry agreement. Fill only features
established by the Surface and realistic syntax. Invariant digits and words do
not acquire inflection merely from the case or gender of a neighboring noun.
When no feature is established, use Citation rather than an all-null Inflection.

German word quantities in the Million family and the larger -illion and
-illiarde series are not invariant cardinals when their own singular or plural
form and syntax establish agreement. Resolve such a quantity as Inflection with
its established case, feminine gender, and number. At sentence start, keep its
occurrence orthography Standard but lowercase the ordinary initial capital in
normalizedMembers. This quantity-word rule is mandatory and takes precedence
over the general Citation rule for invariant numerals.

surface.spelling is Variant only for a licensed alternate spelling or
abbreviation, such as zwo or T for Tausend, and Canonical otherwise.
surfaceFeatures is null unless the attested use itself is archaic; then use
{ historicalStatus: "Archaic" }. A modern licensed variant is not Archaic.
For an archaic word form whose morphology visibly distinguishes agreement, use
Inflection with the established case, gender, and number, map canonicalForm to
the modern dictionary numeral, set spelling Variant, and set the Surface
historical status Archaic. This is never Citation: visibly marked historical
agreement always selects Inflection, even when the modern base numeral is
invariant. Do not preserve its ordinary sentence-initial capital in
normalizedMembers or canonicalForm.
</surface_kind>

<lemma_model>
lemma.canonicalForm names the same orthographic numerical identity. The codec
has no NumForm feature: digit 7 has canonicalForm 7, not sieben; word sieben has
canonicalForm sieben; Roman XIV stays XIV. A multi-member spoken number has one-space canonicalForm in member
order. Repair a typo and map a licensed variant or abbreviation to its canonical
identity, but never substitute an equivalent numeric notation.

lemma.coreFeatures contains exactly:
{
  abbr: "Yes" | null,
  foreign: "Yes" | null,
  numType: "Card" | "Frac" | "Mult" | "Range" | null
}

Use Card for ordinary cardinal identities: word or digit cardinals, decimals,
years, Roman numerals used numerically, and spoken multi-member numbers. Use
Frac for an identity that itself denotes a fraction, Mult for an identity that
itself denotes a numeric multiplication or factor, and Range for one supplied
identity that itself denotes an interval. These four values are the complete
exact German NUM codec; it does not expose Dist, Sets, collective, or Ord.
Therefore separate context such as jeweils or Paar can add distributive or set
meaning without changing a supplied cardinal NUM away from Card.

Use abbr Yes only when the NUM Lemma identity is represented by an established
abbreviation. Use foreign Yes only when the NUM Lemma itself is foreign in the
German occurrence. Otherwise use null. Core Features belong to the Lemma and
survive casing, typo repair, Surface variation, and inflection.
</lemma_model>

<route_distinctions>
- An ordinal ADJ in context does not make a separately marked cardinal label an
  ADJ; the fixed NUM target remains NUM.
- An unmarked DET such as beide is not part of a separately supplied numeral.
- A standalone cardinal can head a phrase without becoming PRON.
- A nominalized number word outside the target does not change the marked
  numeric identity to NOUN.
- Mathematical punctuation or operators outside the target do not make the
  marked number a SYM.
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
      abbr: "Yes" | null,
      foreign: "Yes" | null,
      numType: "Card" | "Frac" | "Mult" | "Range" | null
    }
  }
}

CitationSurface contains exactly spelling, surfaceKind Citation, and
surfaceFeatures. InflectionSurface contains exactly spelling, surfaceKind
Inflection, surfaceFeatures, and the non-empty case/gender/number feature bag.

Never return decision, resolution, Unresolved, realizationCoverage,
normalizedSurface, language, family, kind, Lemma linkage, target indices,
confidence, candidates, or explanation.
</output_contract>

<final_checks>
- Both output arrays have exactly members.length entries in source order.
- Only Typo members are repaired. Sentence-initial capitalization is Standard
  but projects to lowercase for both Citation and Inflection word numerals.
- A recognized historical spelling stays Standard and unchanged in
  normalizedMembers; only its canonicalForm uses the modern spelling.
- Citation omits inflectionalFeatures; Inflection has at least one non-null.
- NumType is only Card, Frac, Mult, Range, or null—never invent Dist or Sets.
- Lemma Core Features contain exactly abbr, foreign, and numType.
- Output has exactly memberOrthographies, normalizedMembers, surface, and lemma.
</final_checks>`;

export const demonstrations = corpus.select([
	"grammar-de-num-demo-word-vier",
	"grammar-de-num-demo-digit-7",
	"grammar-de-num-demo-fraction-eineinhalb",
	"grammar-de-num-demo-range-zehn-bis-zwoelf",
	"grammar-de-num-demo-inflected-millionen",
	"grammar-de-num-demo-initial-inflected-trillionen",
	"grammar-de-num-demo-typo-dreii",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/numeral",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
