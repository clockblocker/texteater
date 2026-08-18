import { definePromptSource } from "../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/Collocation, or return Unresolved without changing the route.

This initial route owns conventional non-idiomatic German verbal support-verb
and Funktionsverbgefüge combinations whose lexical component choices are
restricted, such as eine Entscheidung treffen. Their meaning remains
compositionally connected to the nominal component.

Apply these gates in order and stop at the first failure. A familiar expression
does not override a failed gate.

Gate 1 — Route boundary. First classify the whole marked expression by its
contextual meaning and structure. A freely composed phrase is not a
Collocation. A non-compositional whole belongs to Phraseme/Idiom, and a
fixed multi-member function-word unit belongs to its whole-unit Lexeme POS
route. Return Unresolved for each of those route contradictions even when the
marked words form a familiar fixed expression. Continue only for a conventional
non-idiomatic support-verb or Funktionsverbgefüge combination.

Gate 2 — One occurrence and marked inventory. The input contract has already
validated TARGET syntax and supplies one marked token per pair; do not
revalidate tag syntax. Determine the settled fixed-member inventory of the
current Collocation occurrence. Every marked token must be one of those members
in that same occurrence. The perfect, future, or passive auxiliary attached to
the Collocation's route-owning verbal head is also a fixed high-level member.
Return Unresolved if marked tokens mix occurrences or include a modal, copula,
subject, free argument, modifier, adjunct, or other external material. A marked
support verb alone is Lexeme/VERB and is always Unresolved here. Unmarked free
arguments and modifiers may intervene between marked members; they are context
and do not make an otherwise valid inventory fail. Every Resolved Collocation
has at least two marked members.

Gate 3 — Full realization. There is no proven positive Partial policy for this
initial route. Every canonical lexical member that occurs in the current
occurrence must be marked, and every canonical member must actually occur
there. Return Unresolved if a present canonical member is unmarked or if a
canonical member is absent through ellipsis. Do not complete an ellipsis from
an earlier or later occurrence. A realized perfect, future, or passive
auxiliary must be marked even though it is not written into canonicalForm.
Infinitival zu remains grammatical context. A determiner in the settled
canonicalForm is a canonical member and must have its own TARGET pair when it
occurs; never silently drop it from the Surface.

Only after all three gates pass, return Resolved. Emit exactly one
memberOrthographies value per supplied TARGET pair in textual order.
normalizedMembers contains exactly one normalized string for every TARGET
member from this occurrence, in textual order, without leading, trailing, or
repeated whitespace. Preserve each
member's attested inflection: never lemmatize it or replace it with canonicalForm.
Normalize only a real typo and ordinary sentence-initial capitalization of a
word that is otherwise lowercase; for example, sentence-initial Komm becomes
komm. Never include infinitival zu, modifiers, arguments, planning or other
context words. Every realized analytic auxiliary must already be marked and
therefore appears in normalizedMembers. Never invent, reorder, or borrow
members from another occurrence.

The Lemma canonicalForm names the conventional combination in normalized
dictionary order, including its settled lexical members, for example eine
Entscheidung treffen. Collocation Core Features are exactly {}. This initial
policy resolves only an established canonical component inventory. Return
Unresolved rather than guessing whether a replaced determiner, a bare or plural
nominal, or a different support verb belongs to the same Lemma.

Use Citation only for an explicitly identified dictionary or citation entry.
An ordinary clause use is Inflection and carries the marked support verb's own
contextual morphology even though the whole Surface has several members and
may include a finite analytic auxiliary.
Analyze the support verb as attested in this occurrence; never replace a past
form with present features. Never borrow grammatical features from an unmarked
verb or another occurrence. Finite indicative and subjunctive forms use
verbForm Fin with every established mood, number, person, and tense.
Imperatives use mood Imp, verbForm Fin, and tense null; retain recoverable
number and person, so a singular second-person imperative has number Sing and
person 2. A marked
contextual infinitive remains resolvable when infinitival zu is unmarked: use
verbForm Inf with mood, number, person, and tense null. A marked Partizip II
remains the route-owning head when its auxiliary is also marked. For an ordinary unagreed
Partizip II, emit exactly
{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}.
Never use Aspect=Perf merely for Partizip II and never copy tense from its
auxiliary. The finite analytic auxiliary is a member but never donates head
inflectional-feature values. Keep voice null unless the
marked collocation Surface itself has a settled grammatically passive analysis.

Standard is the exact conventional spelling or ordinary sentence-initial
capitalization of that marked member. Typo means a real spelling error in that
member. Repair typos in normalizedMembers and canonicalForm without changing
member order. spelling is Canonical for ordinary canonical spelling; do not use
Variant to encode a disputed lexical-component alternant. surfaceFeatures is
null unless this exact attested Collocation use is archaic, when it is
{"historicalStatus":"Archaic"}.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

const demonstrations = corpus.select([
	"grammar-de-coll-decision-present-full",
	"grammar-de-coll-frage-citation",
	"grammar-de-coll-verfuegung-present-full",
	"grammar-de-coll-anerkennung-participle-typo-full",
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
