import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/Collocation, or return Unresolved without changing the route.

This initial route owns conventional non-idiomatic German verbal support-verb
and Funktionsverbgefüge combinations whose lexical component choices are
restricted, such as eine Entscheidung treffen. Their meaning remains
compositionally connected to the nominal component. A freely composed phrase
is not a Collocation. A non-compositional whole belongs to Phraseme/Idiom, and
a productive paired frame belongs to Construction.

First inspect TARGET scope mechanically. Require one or more balanced TARGET
pairs, each containing exactly one word-like lexical member with no surrounding
whitespace or dependent. Every pair must mark a member of the same collocation
occurrence. Return Unresolved when one pair spans several words, the pairs mix
occurrences, or marked material includes an auxiliary, subject, external
object, modifier, punctuation, or another dependent. Emit exactly one
memberOrthographies value per opening TARGET tag in textual order.

A Full Surface marks every lexical member of the established canonical
combination. A Partial Surface may mark fewer members only when at least two
marked distinctive components plus the unmarked context still identify exactly
one Collocation Lemma. A marked support verb alone is Lexeme/VERB and is always
Unresolved here. Unmarked auxiliaries, infinitival zu, modifiers, arguments,
and other sentence context may establish grammar without becoming Surface
members. normalizedSurface contains only normalized marked members, joined in
sentence order with one space. Never insert an unmarked canonical member,
reorder marked material, or replace contextual inflection with canonicalForm.

The Lemma canonicalForm names the conventional combination in normalized
dictionary order, including its settled lexical members, for example eine
Entscheidung treffen. Collocation Core Features are exactly {}. This initial
policy resolves only an established canonical component inventory. Return
Unresolved rather than guessing whether a replaced determiner, a bare or plural
nominal, or a different support verb belongs to the same Lemma.

Use Citation only for an explicitly identified dictionary or citation entry.
An ordinary clause use is Inflection and carries the support verb's contextual
verbal features even though the whole Surface has several members. Finite
indicative and subjunctive forms use verbForm Fin with every established mood,
number, person, and tense. Imperatives use mood Imp, verbForm Fin, and tense
null. Contextual infinitives use verbForm Inf with mood, person, and tense null.
For an ordinary unagreed Partizip II, emit exactly
{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}.
Never use Aspect=Perf merely for Partizip II and never copy tense from its
auxiliary. Keep voice null unless the marked collocation Surface itself has a
settled grammatically passive analysis.

Standard is the exact conventional spelling or ordinary sentence-initial
capitalization of that marked member. Typo means a real spelling error in that
member. Repair typos in normalizedSurface and canonicalForm without changing
member order. spelling is Canonical for ordinary canonical spelling; do not use
Variant to encode a disputed lexical-component alternant. surfaceFeatures is
null unless this exact attested Collocation use is archaic, when it is
{"historicalStatus":"Archaic"}.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-coll-decision-present-full",
	"grammar-de-coll-betracht-citation",
	"grammar-de-coll-verfuegung-partial",
	"grammar-de-coll-unresolved-free-book-read",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/collocation",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
