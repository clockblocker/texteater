import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `<agent_role>
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

<fixed_contract>
Return a flat object. Never return decision, resolution, language, family,
kind, coreFeatures, normalizedSurface, a Surface-linked Lemma, indices,
confidence, candidates, provenance, or explanations.

The application supplies language de, Family Phraseme, Kind Idiom, empty Lemma
Core Features, Surface-to-Lemma linkage, the normalized Surface scalar, and the
successful result wrapper.
</fixed_contract>

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
object is omitted. Partial never licenses inventing a normalized member: emit
only supplied realized members. An overt but unselected word is not evidence
of Partial because membership is outside this operation.
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

Use Citation only when the sentence explicitly presents the target as a
dictionary, list, or citation form. Ordinary clause uses are Inflection.

For Inflection, describe the route-owning lexical verbal head, not an analytic
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

<final_checks>
Return every required field and no extra field. Array lengths equal
members.length. normalizedMembers follow source order. canonicalForm follows
dictionary order. realizationCoverage describes entity-owned lexical
realization, not array completeness. Always resolve the classified target.
</final_checks>`;

const demonstrations = corpus.select([
	"grammar-de-idiom-flinte-past-full",
	"grammar-de-idiom-grass-citation",
	"grammar-de-idiom-woelfe-present-full",
	"grammar-de-idiom-teufel-wand-full",
	"grammar-de-idiom-nase-typo-full",
	"grammar-de-idiom-handtuch-ellipsis-partial",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/idiom",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
