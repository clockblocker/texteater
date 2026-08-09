import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/Idiom, or return Unresolved without changing the route.

This route owns established German multiword lexical units whose contextual
whole has a conventional global or figurative meaning that is not computed in
the ordinary way from the individual words.

Apply these gates in order and stop at the first failure. A familiar or
figurative expression does not override a failed gate.

Gate 1 — Route boundary. First classify the whole marked expression by its
contextual function. A restricted but semantically compositional support-verb
expression belongs to Phraseme/Collocation. A complete autonomous anonymous
generalizing saying belongs to Phraseme/Proverb even when its wording is
figurative. A complete formula that independently performs a recurrent
interactional act belongs to Phraseme/DiscourseFormula. An independently
enacted greeting is always DiscourseFormula here, never Idiom. The later
nonverbal Citation allowance never overrides this route gate.
A verb-plus-noun shape alone does not make a Collocation: use that route only
when the noun retains its ordinary lexical predication and the verb primarily
supports it. A conventional whole meaning not recoverable that way remains an
Idiom.
A literal free phrase and a separable verb do not become Idioms merely because
their words resemble an idiom. Return Unresolved for every route contradiction;
continue only for an established Idiom.

Gate 2 — One occurrence and marked inventory. The input contract has already
validated TARGET syntax and supplies one marked word-like member per pair.
Every selected token must be a fixed member of one occurrence of the same
established Idiom. The perfect, future, or passive auxiliary attached to its
route-owning verbal head is also a fixed high-level member. Return Unresolved
when targets mix or repeat occurrences, or include a modal, copula, subject,
free argument, modifier, adjunct, or other external material. Every Resolved
Idiom has at least two selected members.

Evaluate fixed-member identity after repairing an unambiguous selected-member
typo. An unambiguous spelling error does not fail the route or fixed-member
gate: continue with the intended established Idiom, record Typo only for that
member, and repair it in the outputs. Return Unresolved only when the intended
member or correction is genuinely uncertain; this is distinct from a disputed
component alternant or lexicalized variant.

For a contextual Inflection, the selected members must include the inflecting
verbal head: an omitted contextual verbal head forces Unresolved even if the
unmarked verb identifies the Idiom. Never borrow Inflection features from an
unselected verb or from another occurrence. A selected verbal head alone
remains Lexeme/VERB and is Unresolved here. Infinitival zu, free arguments, and
modifiers may establish grammar without becoming Surface members; a realized
analytic auxiliary must be selected.
For a contextual clause, inspect the selected members themselves before using
surrounding grammar. If no selected member is the occurrence's finite,
infinitive, or participial verbal head, return Unresolved. An unmarked verbal
head never satisfies this requirement. The only no-head allowance is an
explicitly identified Citation, not an ordinary clause.

Gate 3 — Realization coverage. Use Full when every overt fixed member
of this idiom occurrence is selected. The only authoritative positive Partial
evidence is the repository's heulte mit Surface for the Lemma mit den Wölfen
heulen, reproduced below. Do not generalize that one example to another idiom
merely because its verbal head and one fixed member are selected. Broader
head-plus-member Partial semantics, ellipsis, and lexical substitution remain
unsettled and are Unresolved. Never insert absent or unselected material. This
narrow exception is Idiom-specific; do not import it into another Phraseme
route.

Only after all three gates pass, return Resolved. Emit exactly one
memberOrthographies value per supplied pair in textual order.

normalizedMembers contains exactly one normalized string per selected member
in actual sentence order, without leading, trailing, or repeated whitespace.
Never invent an unselected member,
reorder to dictionary order,
or replace contextual inflection with canonicalForm. A realized perfect,
future, or passive auxiliary must be selected and appears in this projection,
while unmarked infinitival zu never appears. The Lemma canonicalForm is
the normalized dictionary form with German noun capitalization and the entire
settled fixed-member inventory. Retain an obligatory reflexive pronoun such as
sich in canonicalForm; do not drop a fixed member merely because context makes
it predictable. Idiom Core Features are exactly {}. Return Unresolved rather
than guess a disputed component alternant or lexicalized variant.

Use Citation only for an explicitly identified dictionary or citation entry.
An ordinary clause use is Inflection. This initial contextual route resolves
verbal Idioms because the Dumling Idiom Inflection Surface carries German VERB
features. Citation may represent an established nonverbal Idiom because it has
no inflectional payload.

Determine verbForm from the route-owning selected lexical head before assigning
features. Only a finite lexical head licenses verbForm Fin. A lexical infinitive
licenses Inf, and a lexical Partizip II licenses Part; a selected finite
analytic auxiliary cannot change either one to Fin.

Finite indicative and subjunctive forms use verbForm Fin with every established
mood, number, person, and tense. German Konjunktiv I receives tense Pres and
Konjunktiv II receives tense Past. Imperatives use mood Imp, verbForm Fin, and
tense null; retain recoverable number and person, so a singular second-person
imperative has number Sing and person 2. Contextual infinitives use verbForm
Inf with mood, person, and tense null. A marked Partizip II remains verbForm
Part even when a selected finite analytic auxiliary establishes its clause
context. For an ordinary unagreed Partizip II, emit exactly
{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}.
Never use Aspect=Perf merely for Partizip II and never copy tense from its
auxiliary. Keep voice null unless the marked Idiom Surface itself has a settled
grammatically passive analysis.

Standard is exact conventional spelling or ordinary sentence-initial
capitalization. Normalize ordinary sentence-initial capitalization to the
lexical casing without calling it a Typo: in particular, imperative Blase
normalizes to blase while the noun Trübsal stays uppercase. Typo means a real
error in that selected member. Repair typos in normalizedMembers and
canonicalForm without changing order. A Typo repair does not make Surface
spelling Variant: memberOrthographies records the input error, while the
repaired canonical Surface uses spelling Canonical. Reserve Variant for a
licensed noncanonical orthographic form. surfaceFeatures is null unless this
exact attested use is archaic, when it is {"historicalStatus":"Archaic"}.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, the Surface's linked Lemma,
target indices, Reading data, provenance, confidence, candidates, or
explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-idiom-flinte-past-full",
	"grammar-de-idiom-flinte-participle-typo-full",
	"grammar-de-idiom-grass-citation",
	"grammar-de-idiom-woelfe-past-partial",
	"grammar-de-idiom-unresolved-proverb-grube",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/idiom",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
