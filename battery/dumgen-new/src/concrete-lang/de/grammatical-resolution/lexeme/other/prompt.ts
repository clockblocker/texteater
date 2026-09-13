import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/X"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/other",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one valid, already-classified German Lexeme/X Analysis
Target. Return its smallest codec-supported Surface and Lemma grammar. Do not
classify the target, diagnose it as invalid, or reconsider its membership.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. TARGET spans and
members are authoritative projections of the same complete ordered target.
Return one memberOrthographies and one normalizedMembers entry per supplied
member, preserving source order.

Always resolve the supplied X. Never reject, add, remove, merge, split, or
reorder membership. Never turn X back into a diagnostic Unresolved route. A
readable classified X may be unknown, foreign or code-switched Latin material,
slang, fragmentary, mixed-orthography, or category-indeterminate while still
being ResolvableText.
</input_contract>

<fixed_route>
X is a residual grammatical identity, not an execution failure. The upstream
classifier has already distinguished the supplied target from OpaqueText, a
known abbreviation, PROPN, SYM, INTJ, and every identifiable German POS. Those
kinds may appear unmarked nearby as context controls. Never use nearby route
material to replace or widen the selected X identity. Repeated unmarked
occurrences also remain context.
</fixed_route>

<member_projection>
Standard means the supplied spelling is licensed for this X identity, including
ordinary sentence-initial capitalization, established abbreviation casing,
mixed letter-digit spelling, an internal hyphen, and licensed variants.
Typo means a genuine local spelling or casing error. Repair only Typo members in
normalizedMembers. Ordinary sentence-initial Whatever normalizes to whatever
but remains Standard. Preserve registered internal casing, digits, and a
meaningful internal hyphen. Never normalize unmarked context.
</member_projection>

<surface>
Use null inflectionalFeatures when the occurrence expresses no codec-supported inflection. This
includes explicit entries and quotations plus invariant contextual X forms such
as foreign insertions or slang when case, gender, mood, number, and verbForm are
all unsupported.

Use an inflectionalFeatures object only when syntax supports at least one of case, gender, mood,
number, or verbForm. Include all five nullable inflectionalFeatures keys. The feature bag must contain at
least one non-null value. Determiners and government may license conservative
nominal case, gender, and number even when lexical category remains unknown.
Transparent unknown verbal morphology may license mood, number, and verbForm.
Never invent a non-null feature simply to populate inflectionalFeatures; use null inflectionalFeatures when
the codec-supported distinctions are all unsupported.

Residual X identity concerns the absence of a more informative lexical route;
it does not erase transparent contextual morphology. A governing German article
or determiner makes a nonce nominal form carry inflectionalFeatures when it supports case,
gender, or number. For a different teaching form, mit dem Nerp licenses Dat,
Neut, Sing. Transparent verbal templates also require inflectionalFeatures: soll nargen
licenses verbForm Inf; sie nargt licenses Ind, Sing, Fin with canonicalForm
nargen; hat genargt licenses Part; and sentence-initial Narg! licenses Imp,
Sing, Fin. The initial capital in that command is Standard, normalized narg,
and must not introduce nominal case or gender. For a transparently inflected
nonce verb, canonicalForm is its defensible infinitive rather than the contextual
finite or participial spelling.

Keep normalizedMembers contextual and canonicalForm lexical. Thus an attested
finite nargt remains normalized nargt but has canonicalForm nargen. An attested
sentence-initial imperative Narg is ordinary initial capitalization: Standard,
normalizedMembers ["narg"], and canonicalForm nargen. Never copy contextual
initial capitalization into either normalized value or a lowercase nonce-verb
Lemma.

For a finite nonce X inside indirect speech introduced by a reporting verb such
as sagte, erklärte, or berichtete, a distinct transparent Konjunktiv form ending
in -e licenses mood Sub rather than Ind. Return number Sing when the reported
subject is singular and verbForm Fin. This narrow rule does not make every -e
form subjunctive: direct assertion, unclear morphology, or missing reported-
speech syntax leaves mood unsupported or follows its independently licensed
analysis.

spelling is Canonical for an ordinary licensed form and for a repaired Typo.
Use Variant only for an explicitly licensed spelling variant of the same Lemma,
such as British colour mapped to canonical color in an English insertion.
surfaceFeatures is null unless the grammatical use itself is archaic; then use
{ historicalStatus: "Archaic" }. A historical document alone is not enough.
When context explicitly calls the exact supplied grammar archaic, historical,
or obsolete—such as old foreign pronoun ye used inside a historical quotation—
return Archaic. This differs from a current word merely printed in an old book.
</surface>

<lemma>
lemma contains exactly canonicalForm and coreFeatures. canonicalForm is the
normalized lexical identity: preserve conventional abbreviation casing and
mixed spelling; remove contextual nominal or verbal inflection when a base is
defensible; map a Typo or licensed Variant to its intended canonical identity.
Do not translate foreign material or guess an expansion.

coreFeatures contains exactly { abbr, foreign, hyph, numType }; every key is
mandatory and nullable. Use Yes only when the identity itself is an established
abbreviation, overt foreign form, or hyphen-bearing form. foreign reflects the
current code-switched identity, not remote etymology: integrated slang may be
null. Use foreign Yes only when context presents the current token as a foreign
or code-switched insertion; recognizable origin or English-looking spelling is
not enough. German-scene youth or forum slang presented as integrated usage has
foreign null unless the context explicitly says otherwise. hyph records a
meaningful internal hyphen. numType is Card,
Mult, or Range only when the X identity transparently carries that numerical
function. A compact identity such as 4K is abbr Yes and numType Card when its
digit transparently expresses the cardinal component; mixed shape alone remains
insufficient. Use null for every unsupported distinction.
</lemma>

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
		"grammar-de-x-demo-unknown-citation-zorp",
		"grammar-de-x-demo-foreign-whatever",
		"grammar-de-x-demo-inflection-glorp-dat",
		"grammar-de-x-demo-typo-watevr",
		"grammar-de-x-demo-abbr-idk",
		"grammar-de-x-demo-fragment-unver",
		"grammar-de-x-demo-inflection-nerpa-acc",
		"grammar-de-x-demo-inflection-plerke-sub",
	],
	source: import.meta.url,
});
