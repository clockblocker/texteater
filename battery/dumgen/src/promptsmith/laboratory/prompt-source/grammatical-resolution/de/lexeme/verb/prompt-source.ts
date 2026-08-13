import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the supplied German
Lexeme/VERB target.

Target Classification has already established the route and complete target
membership. Do not reclassify, reject, add, remove, or reorder members. members
contains the exact attested target Segment texts in source order. Each entry
aligns positionally with one TARGET pair in markedContext. Discontinuous and
repeated equal members remain separate entries.

Identify the route-owning lexical VERB head among the supplied members. Other
members may be a governed preposition, inherently reflexive pronoun, detached
separable prefix, or the auxiliary of a perfect, future, or passive complex.
Perfect-forming haben and sein and future/passive werden do not replace the
lexical head. A modal AUX is never a member of this VERB target. Possession
haben, lexical werden meaning become, existential lexical uses, and spellings
also used as modals remain ordinary lexical VERBs when Target Classification
routes them here.

Emit exactly one memberOrthographies and one normalizedMembers entry per input
member. Standard includes canonical spelling and ordinary sentence-initial
capitalization. Typo means an actual spelling or inappropriate-casing error.
Copy Standard material exactly except that ordinary sentence-initial
capitalization is lowercased. Repair only actual typos. Except for ordinary
sentence-initial casing, any changed member requires Typo. Preserve every
member and the lexical head's attested morphology.

Use Citation only for an explicitly identified dictionary or citation form. A
verb used in a clause is Inflection even when its text equals the infinitive.
For an indicative or subjunctive finite form, emit verbForm Fin and every
contextually established mood, number, person, and tense. In German,
Konjunktiv I has tense Pres and Konjunktiv II has tense Past. For an imperative,
emit mood Imp, verbForm Fin, and tense null. For an infinitive, emit verbForm
Inf and null mood, person, and tense; number is null unless overtly
established. For an ordinary unagreed German Partizip II lexical head, emit exactly
{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}.
Never label it verbForm Inf, never emit aspect Perf, and never copy tense from
the finite auxiliary even though that auxiliary is a target member. A future
lexical head remains verbForm Inf. Keep gender and number null unless overt
agreement establishes them, and mood and person are null. Do not copy passive
voice from the whole periphrastic complex onto an ordinary lexical head; use
voice null unless the head itself is unambiguously grammatically passive.
surfaceFeatures is null unless the attested form is archaic.

The Lemma canonicalForm is the dictionary infinitive of the supplied VERB. A
lexically reflexive Lemma includes sich in canonicalForm, such as sich
erinnern. Core Features contain exactly hasGovPrep, hasSepPrefix,
and lexicallyReflexive, including every nullable key. hasGovPrep is
the lexically selected preposition string; when that preposition is realized,
it is also a Surface member. hasSepPrefix is the separable prefix string whether
attached or detached in this form. Determine hasSepPrefix and hasGovPrep
independently. A marked detached prefix supplies only hasSepPrefix; it does not
by itself establish hasGovPrep, even when the two features share a spelling.
hasGovPrep requires independent lexical-valency evidence from a distinct
functional occurrence. lexicallyReflexive is Yes only when reflexivity is
inherent, not merely contextual. These occurrence members do not change the
Lemma canonicalForm.

Return only memberOrthographies, normalizedMembers, surface, and lemma. Never
return a decision or resolution wrapper, realizationCoverage, verbType,
language, family, kind, a linked Lemma inside Surface, target indices, Reading
data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-verb-finite-liest",
	"grammar-de-verb-citation-arbeiten",
	"grammar-de-verb-separable-imperative-aufpassen",
	"grammar-de-verb-reflexive-erinnert",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/verb",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
