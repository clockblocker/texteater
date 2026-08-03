import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/Idiom, or return Unresolved without changing the route.

This route owns established German multiword lexical units whose contextual
whole has a conventional global or figurative meaning that is not computed in
the ordinary way from the individual words. A restricted but semantically
compositional support-verb expression belongs to Phraseme/Collocation. A
complete anonymous generalizing saying belongs to Phraseme/Proverb. A complete
formula that independently performs a recurrent interactional act belongs to
Phraseme/DiscourseFormula. A literal free phrase and a separable verb do not
become Idioms merely because their words resemble an idiom.

The input contract has already validated TARGET syntax and supplies one marked
word-like member per pair. Decide semantic membership: every selected token
must be a fixed lexical member of one occurrence of the same established
Idiom. Return Unresolved when targets mix or repeat occurrences, or include a
subject, auxiliary, argument, modifier, or other external material. Every
Resolved Idiom has at least two selected members. Emit exactly one
memberOrthographies value per supplied pair in textual order.

For a contextual Inflection, the selected members must include the inflecting
verbal head. Never borrow Inflection features from an unselected verb or from
another occurrence. A selected verbal head alone remains Lexeme/VERB and is
Unresolved here. Unmarked auxiliaries, infinitival zu, arguments, and modifiers
may establish grammar without becoming Surface members.

Use Full when every overt fixed lexical member of this idiom occurrence is
selected. The only authoritative positive Partial evidence is the repository's
heulte mit Surface for the Lemma mit den Wölfen heulen, reproduced below. Do
not generalize that one example to another idiom merely because its verbal head
and one fixed member are selected. Broader head-plus-member Partial semantics,
ellipsis, and lexical substitution remain unsettled and are Unresolved. Never
insert absent or unselected material. This narrow exception is Idiom-specific;
do not import it into another Phraseme route.

normalizedSurface contains only normalized selected members joined in actual
sentence order. Never invent an unselected member, reorder to dictionary order,
or replace contextual inflection with canonicalForm. The Lemma canonicalForm
is the normalized dictionary form with German noun capitalization and the
settled fixed-member inventory. Idiom Core Features are exactly {}. Return
Unresolved rather than guess a disputed component alternant or lexicalized
variant.

Use Citation only for an explicitly identified dictionary or citation entry.
An ordinary clause use is Inflection. This initial contextual route resolves
verbal Idioms because the Dumling Idiom Inflection Surface carries German VERB
features. Citation may represent an established nonverbal Idiom because it has
no inflectional payload.

Finite indicative and subjunctive forms use verbForm Fin with every established
mood, number, person, and tense. German Konjunktiv I receives tense Pres and
Konjunktiv II receives tense Past. Imperatives use mood Imp, verbForm Fin, and
tense null. Contextual infinitives use verbForm Inf with mood, person, and tense
null. For an ordinary unagreed Partizip II, emit exactly
{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}.
Never use Aspect=Perf merely for Partizip II and never copy tense from its
auxiliary. Keep voice null unless the marked Idiom Surface itself has a settled
grammatically passive analysis.

Standard is exact conventional spelling or ordinary sentence-initial
capitalization. Normalize ordinary sentence-initial capitalization to the
lexical casing without calling it a Typo: in particular, imperative Blase
normalizes to blase while the noun Trübsal stays uppercase. Typo means a real
error in that selected member. Repair typos in normalizedSurface and
canonicalForm without changing order. spelling is Canonical for ordinary
canonical spelling. surfaceFeatures is null unless this exact attested use is
archaic, when it is {"historicalStatus":"Archaic"}.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, the Surface's linked Lemma,
target indices, Reading data, provenance, confidence, candidates, or
explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-idiom-flinte-past-full",
	"grammar-de-idiom-grass-citation",
	"grammar-de-idiom-woelfe-past-partial",
	"grammar-de-idiom-unresolved-literal-grass",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/idiom",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
