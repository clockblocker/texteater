import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/Idiom"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/phraseme/idiom",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the German Phraseme/Idiom Analysis Target to its Lemma and Surface grammar.
The caller has already classified one valid Idiom target. Always resolve it.
</agent_role>

<input_contract>
Input is exactly {markedContext,members}. TARGET spans in markedContext and the
members array are two authoritative projections of the same target. They have
already passed syntax, route, occurrence, and membership validation.

Never add, remove, reorder, reject, repair, or reclassify input membership.
Unmarked text is context only. It may contain literal wording, a different
Phraseme kind, a free Lexeme, or another occurrence. Resolve only the marked
members. Return one memberOrthographies value and one normalizedMembers value
for every supplied member, in source order.
</input_contract>

<idiom_analysis>
Infer the established Idiom's normalized dictionary form. canonicalForm keeps
the complete settled lexical inventory in dictionary order and German noun
capitalization. Retain obligatory reflexive pronouns and fixed function words.
Free arguments and inserted modifiers can inform grammar but do not enter the
Lemma. canonicalForm contains entity-owned lexical material, not dictionary
valency placeholders: never insert jemandem, jemanden, jemandes, etwas, or
similar placeholders for a free participant that is absent from the fixed
inventory.

The selected members are authoritative even when discontinuous, repeated
elsewhere, or surrounded by wording typical of a Proverb, Aphorism,
DiscourseFormula, Collocation, literal phrase, or ordinary Lexeme. Such context
does not reopen classification.
</idiom_analysis>

<coverage>
realizationCoverage is Full when this occurrence realizes all entity-owned
lexical material. It is Partial only when settled Idiom material is genuinely
unrealized yet the exact occurrence and full Lemma remain defensible, chiefly
recoverable coordination ellipsis such as a second parallel clause whose fixed
object is omitted, or a conventional truncation such as was zum … whose
realized members identify the complete Idiom was zum Teufel. Partial never
licenses inventing a normalized member: emit only supplied realized members.
An overt but unselected word is not evidence of Partial because membership is
outside this operation.
</coverage>

<surface_projection>
normalizedMembers repairs only unambiguous selected-member typos and otherwise
preserves contextual form and source order. Standard includes conventional
spelling and ordinary sentence-initial capitalization; normalize lexical
casing without calling it Typo. In particular, a sentence-initial or imperative
verb such as Wirf normalizes to wirf, while German nouns retain capitalization.
Typo means a real selected-member error. A typo repair does not make Surface
spelling Variant. Use Variant only for a licensed noncanonical orthographic
form. surfaceFeatures is null unless this exact use is archaic, then
{historicalStatus:"Archaic"}.

Use null inflectionalFeatures when the sentence explicitly presents the target as a dictionary,
list, or citation form, and for an invariant non-verbal Idiom occurrence with
no supported inflectional evidence. Thus partial was zum … has null inflectionalFeatures while
its missing Teufel is represented only by realizationCoverage Partial and the
complete canonicalForm. Ordinary verbal clause uses have marked inflectionalFeatures.

For inflectionalFeatures, describe the route-owning lexical verbal head, not an analytic
auxiliary. A finite head uses verbForm Fin. Indicative and subjunctive finite
forms use mood Ind or Sub with recoverable person, number, and tense; German
Konjunktiv I maps to Pres and Konjunktiv II to Past. Imperatives use mood Imp,
verbForm Fin, tense null, and recoverable person and number. An infinitive uses
verbForm Inf with mood, person, and tense null. A Partizip II uses verbForm Part
with aspect, gender, mood, number, person, and tense null unless the form itself
settles one of those values. Do not copy perfect, future, or passive auxiliary
tense onto an infinitive or participle. Set voice Pass only when the Idiom
Surface itself is grammatically passive.

Decide lexical head before recognizing an auxiliary. A finite form of haben,
sein, or werden is the lexical head when the Idiom Lemma itself is headed by
that verb, and therefore stays Fin. It is analytic only when a different
selected lexical infinitive or participle heads the Idiom.

Aspect=Perf does not mean German perfect tense and is not licensed merely by a
Partizip II or a selected perfect auxiliary. For an ordinary unagreed German
Partizip II, aspect is null along with gender, mood, number, person, and tense.

The codec also permits the fifth, underspecified verbal branch:
{number,tense,verbForm:null,voice}. Use it only when contextual evidence cannot
classify the verbal head as Fin, Inf, or Part. Do not use it merely to avoid a
recoverable analysis.

Perfect, future, and passive auxiliaries supplied in members remain projected
members because classification already owns membership. Infinitival zu that is
not supplied remains context only.
</surface_projection>

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

Set realizationCoverage to Full for a complete realization, or Partial only
where the route's coverage policy permits unrealized lexical material. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-idiom-flinte-past-full",
		"grammar-de-idiom-grass-citation",
		"grammar-de-idiom-woelfe-present-full",
		"grammar-de-idiom-teufel-wand-full",
		"grammar-de-idiom-nase-typo-full",
		"grammar-de-idiom-handtuch-ellipsis-partial",
	],
	source: import.meta.url,
});
