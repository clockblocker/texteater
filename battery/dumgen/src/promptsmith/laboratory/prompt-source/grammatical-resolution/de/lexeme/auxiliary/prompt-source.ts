import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/AUX, or
return Unresolved without changing the route.

Resolve only when exactly one TARGET pair marks one complete form of one
identifiable auxiliary Lexeme. Return Unresolved when there is more than one
TARGET pair, even if the marked forms repeat the same Lemma. Judge overbreadth
only from material literally inside the TARGET pair: reject when that marked
span contains the governed infinitive, participle, predicate, object, or
another dependent. Material outside TARGET is grammatical context and evidence;
an outside predicate or complement does not make a one-form TARGET overbroad.
Also return Unresolved when the marked use is a lexical full verb, belongs to
another route, or lacks enough context to establish one AUX identity.

The German AUX route includes haben and sein when they form a perfect, werden
when it forms a future or passive, copular sein, and the modal auxiliaries
dürfen, können, mögen, müssen, sollen, and wollen when they govern a bare
infinitive. Copular sein is AUX in finite, imperative, infinitive, and
participial forms; an outside adjective or nominal predicate is evidence for
that copular use. The same spellings may instead be full VERB uses: possession haben,
lexical werden meaning become, existential sein, and modal-verb forms with
their own nominal complement are not AUX. Do not admit peripheral or
semi-modal lexical verbs merely because they contribute modal meaning.

Count literal opening <TARGET> tags and resolve only when the count is exactly
one. Emit exactly one memberOrthographies value. Standard includes ordinary
sentence-initial capitalization. Typo means an actual spelling or
inappropriate-casing error.
normalizedMembers is the normalized contextual lexical material: lowercase
ordinary sentence-initial capitalization and repair only typos, while
preserving lexical-member order. If normalization repairs spelling or casing
other than ordinary sentence-initial capitalization, emit Typo for that member.

Use a Citation Surface only for an explicitly identified dictionary or
citation form. A verb form used in a clause is an Inflection Surface, including
a form whose text happens to equal the infinitive. For indicative or
subjunctive finite forms, emit verbForm Fin and the contextually established
mood, number, person, and tense. In German, Konjunktiv I has tense Pres and
Konjunktiv II has tense Past. For an imperative, emit mood Imp, verbForm Fin,
and tense null. For an infinitive, emit verbForm Inf and null mood, person, and
tense; number is null unless overtly established. For a participle such as
gewesen, emit verbForm Part. German AUX participles do not carry Aspect or
Tense in this route, so emit null aspect, mood, person, and tense; gender and
number are null unless overt agreement establishes them. Do not copy
passive voice from the whole verbal complex onto the auxiliary form; use voice
null unless the marked form itself is grammatically passive. surfaceFeatures is
null unless the attested form is archaic. realizationCoverage is Full when the
complete auxiliary form is marked.

The Lemma canonicalForm is the infinitive citation form of the same auxiliary.
Core Features contain exactly verbType. Emit verbType Mod for the six modal
auxiliaries only when the marked use is modal; emit null for haben, sein,
werden, and copular sein. Core Features are lexical identity, not contextual
inflection.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-aux-demo-future-wird",
	"grammar-de-aux-demo-modal-kann",
	"grammar-de-aux-demo-modal-citation-duerfen",
	"grammar-de-aux-demo-typo-sol",
	"grammar-de-aux-demo-unresolved-full-verb-schlaeft",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
