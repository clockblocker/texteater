import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Lexeme/VERB, or return Unresolved without changing the route.

First apply a mechanical TARGET-scope gate before grammatical classification.
Inspect the literal content inside every balanced TARGET pair. Every pair must
contain exactly one word-like member, and the pairs must identify exactly one
route-owning lexical VERB head. Alongside that head, accept every realized
fixed member of the same high-level unit: a governed preposition, an inherently
reflexive pronoun, a detached separable prefix, and the auxiliary of a perfect,
future, or passive complex. These members may be discontinuous. Equal strings
at different positions remain separate members; in Pass auf dich auf the first
auf is governed and the second is the detached prefix, while free reflexive
dich remains outside the target. Return Unresolved for repeated occurrences,
unrelated verbs, a missing required head or separable member, modal or copular
combinations, contextual reflexives, free arguments, adjuncts, modifiers, or
any other overbroad target. Count literal opening TARGET tags and emit exactly
one memberOrthographies value per tag in textual order.

Keep the AUX/VERB boundary exact. Perfect-forming haben and sein and
future/passive werden are fixed target members when they accompany the lexical
VERB head, but the result still belongs to that head's Lexeme/VERB route.
Copular sein and dürfen, können, mögen, müssen, sollen, or wollen governing a
bare infinitive instead remain separate high-level units and are Unresolved as
a combined VERB target. Possession haben, lexical werden meaning become,
existential lexical uses, and a modal spelling used as a full verb with its own
nominal complement belong to VERB. For that non-modal full-verb use, verbType
is null; never copy an AUX analysis onto it. A full modal spelling with its own
nominal complement must have verbType null; do not infer verbType Mod from
spelling alone.

Keep the ADJ/VERB participle boundary exact. A bare participle selected by a
perfect auxiliary belongs to VERB. An attributive participle carrying
adjectival agreement, and an established lexicalized adjective, belong to ADJ
and are Unresolved here. A predicative participle can be ambiguous; resolve it
only when context identifies the verbal participle rather than a lexicalized
adjective.

Standard member orthography includes canonical spelling and ordinary
sentence-initial capitalization. Typo means an actual spelling or
inappropriate-casing error. normalizedMembers contains exactly one normalized
string for every marked member in sentence order, without leading, trailing,
or repeated whitespace:
lowercase ordinary sentence-initial capitalization and repair only typos.
Never remove an auxiliary, reflexive, governed preposition, or repeated
same-text member from this projection. Except for ordinary sentence-initial
casing, any changed marked spelling requires Typo. Preserve the lexical head's
attested morphology. realizationCoverage is Full when every realized fixed
member is marked; a missing free complement or adjunct does not make it
Partial, while an omitted overt fixed member makes the target invalid.

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

The Lemma canonicalForm is the dictionary infinitive of the same VERB. A
lexically reflexive Lemma includes sich in canonicalForm, such as sich
erinnern. Core Features contain exactly hasGovPrep, hasSepPrefix,
lexicallyReflexive, and verbType, including every nullable key. hasGovPrep is
the lexically selected preposition string; when that preposition is realized,
it is also a Surface member. hasSepPrefix is the separable prefix string whether
attached or detached in this form. Determine hasSepPrefix and hasGovPrep
independently. A marked detached prefix supplies only hasSepPrefix; it does not
by itself establish hasGovPrep, even when the two features share a spelling.
hasGovPrep requires independent lexical-valency evidence from a distinct
functional occurrence. lexicallyReflexive is Yes only when reflexivity is
inherent, not merely contextual. These occurrence members do not change the
Lemma canonicalForm. verbType is Mod only for a VERB identity that is itself
modal; ordinary full verbs use null.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

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
