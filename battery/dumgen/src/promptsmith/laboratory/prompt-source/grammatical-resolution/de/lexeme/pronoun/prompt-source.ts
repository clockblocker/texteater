import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/PRON,
or return Unresolved without changing the route.

Before any linguistic analysis, count the literal opening <TARGET> tags and
literal closing </TARGET> tags. If either count is not exactly one, return
Unresolved. Then identify the target's lexical route. If it is not one
identifiable PRON Lexeme occurrence, return Unresolved before constructing any
Surface or Lemma. This includes a target that contains an adposition or another
syntactic dependent, material from another route, or insufficient context for
one exact pronoun analysis. Emit exactly one memberOrthographies value when
Resolved.

The German DET/PRON boundary is lexical, not syntactic. PRON contains lexemes
that function substantively. Inflecting determiner lexemes such as jener, mein,
kein, welcher, alle, and beide remain DET even when they head a nominal alone.
Use syntax to distinguish a substantive indefinite proform from a homographic
degree modifier on the ADV route. A self-standing cardinal stays NUM, and an
article plus capitalized word can establish a nominalized NOUN rather than a
pronoun.

Every resolved PRON Lemma requires a non-null pronType. Use Prs for personal
and reflexive identities. Use Ind for an identity with an unknown or
unspecified referent that does not assert non-existence. Use Neg for an identity
that asserts that no referent exists; never widen Neg to the broader Ind class.
Use Rcp for a distinct identity expressing a mutual relation. Person is a stable
Core Feature only for personal pronouns. Use person 1, 2, or 3 as established by
the paradigm.
The formal second-person address paradigm has person 2, polite Form, and a
canonicalForm equal to its required-capitalization nominative citation form.
Preserve the required capitalization of every form in that paradigm. Do not
assign it Number: formal address can refer to singular or plural addressees.
Keep polite null for other authoritative cases. Keep extPos, foreign, and poss
null unless an established identity requires them.

The exact codec accepts only one scalar pronType. When an established identity
requires a combined PronType value, return Unresolved rather than discard one
of the required values or create a context-dependent Lemma identity.

Use Citation for an explicit dictionary entry or mention of the form itself and
for an invariant whole-form occurrence whose normalized Surface is already in
the Lemma's citation or Grundform shape, including a licensed whole-form
variant, and carries no contextual distinction encoded by the form. Use
Inflection only when the occurrence genuinely realizes at least one of case,
gender, number, or reflex. This includes syncretic personal and reflexive
paradigm forms when context establishes their grammatical contrast. The exact
schema forbids an all-null inflectionalFeatures object. Do not manufacture an
inflectional value for an invariant indefinite, negative, or reciprocal form
solely from its syntactic role. For an Inflection, fill established values and
keep the remaining nullable fields null. Case is Nom, Acc, Dat, or Gen. Gender
belongs to the contextual Surface under the exact codec. Number is Sing or Plur
when established by the paradigm; do not invent gender for first- or
second-person forms.

Reflex is a contextual Surface feature. Set reflex Yes when syntax establishes
a reflexive occurrence and otherwise null. First- and second-person forms keep
their ordinary personal Lemma in reflexive use. The dedicated third-person
reflexive form has person 3 and pronType Prs. A reciprocal reading of a
reflexive form does not change its stable Core Features; a distinct reciprocal
Lexeme has pronType Rcp and reflex null.

Standard includes canonical spelling, ordinary sentence-initial capitalization,
and required formal capitalization. Lowercase ordinary sentence-initial forms
in normalizedSurface, but preserve required formal-address capitalization.
Typo means an actual orthographic error; repair it in normalizedSurface and
canonicalForm. Licensed colloquial forms preserve their normalized variant
spelling, use spelling Variant, and take the standard canonical Lemma rather
than Typo. Never lemmatize an ordinary contextual Surface.

Final orthography check: if normalizedSurface or canonicalForm repairs marked
characters beyond ordinary sentence-initial capitalization, the corresponding
memberOrthographies value must be Typo. Standard is inconsistent with such a
repair.

surfaceFeatures is null unless the attested use is archaic, when it is
{"historicalStatus":"Archaic"}. Resolved has a non-null resolution; Unresolved
has resolution null. Return only model fields: never language, family, kind, a
linked Lemma inside Surface, target indices, Reading data, confidence,
candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-pron-citation-man",
	"grammar-de-pron-inflection-dative-ihm",
	"grammar-de-pron-unresolved-determiner-jener",
	"grammar-de-pron-unresolved-numeral-zwei",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/pronoun",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
