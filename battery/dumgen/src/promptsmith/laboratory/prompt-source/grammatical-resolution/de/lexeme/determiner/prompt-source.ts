import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/DET, or
return Unresolved without changing the route.

Resolve only when exactly one TARGET pair marks the lexical material of one
identifiable determiner occurrence. Return Unresolved whenever there is more
than one TARGET pair, even if the marked forms repeat the same Lemma. Also
return Unresolved when a target contains its
noun, adjective, numeral, or another syntactic dependent; combines unrelated
determiners; belongs to another route; is an adposition-article Fusion such as
im or zum; or lacks enough context to choose one grammatical determiner
identity.

The German DET/PRON boundary is lexical, not a rule about whether a noun is
present. Article ein and inflecting pronominal determiners such as dieser,
jener, mein, kein, welcher, alle, and beide remain DET when they head a
nominal alone. Personal er, substantive interrogative wer, and the relative-
pronoun Lexeme der belong to PRON. Do not resolve a relative der as the
homonymous definite-article Lemma. The self-standing numeral eins is NUM, while
the article and inflecting determiner ein are DET.

Count literal opening <TARGET> tags and resolve only when the count is exactly
one. A resolved output therefore has exactly one memberOrthographies value.
Standard includes canonical spelling, ordinary sentence-initial capitalization,
and the required formal capitalization of possessive Ihr. Typo means an actual
spelling or inappropriate-casing error. normalizedMembers is the normalized
contextual determiner form: lowercase ordinary sentence-initial capitalization
and repair only typos, but preserve formal Ihr/Ihrem capitalization, inflection,
lexical membership, and spelling. Never lemmatize the Surface or include the
modified noun. If normalization repairs marked characters, emit Typo.

Use Citation only for an explicit dictionary entry, citation label, or other
mention of the form itself. A determiner in ordinary syntax is Inflection when
the current schema can express at least one contextual feature. Its
inflectionalFeatures describe this occurrence: case, agreement gender and
number, degree, and the separately layered possessor gender or number. Infer
case and agreement from this target's own noun phrase and syntax, never from an
unmarked repeated form. Agreement case, gender, and number come from the
modified or possessed noun phrase, not from a possessor. Plural agreement does
not erase the modified noun's gender: alle and beide still carry the noun's
scored agreement gender. The exact German DET schema currently permits only
Masc and Neut for agreement gender; for feminine agreement emit gender null
rather than inventing an unsupported value.

The Lemma canonicalForm is the complete normalized citation form of the same
determiner. Core Features are stable lexical identity. Apply this Mandatory Core
Feature table exactly; each row lists pronType, definite, numType, poss, person,
and polite in that order:

Subclass | pronType | definite | numType | poss | person | polite
Definite article der | Art | Def | null | null | null | null
Indefinite article ein | Art | Ind | Card | null | null | null
Demonstrative | Dem | null | null | null | null | null
Interrogative | Int | null | null | null | null | null
Negative kein | Neg | null | null | null | null | null
Total alle | Tot | null | null | null | null | null
Total beide | Tot | null | Card | null | null | null
Indefinite pronominal | Ind | null | null | null | null | null
Personal possessive | Prs | null | null | Yes | 1/2/3 | null

Among articles, only ein receives numType Card; outside the article rows, the
listed total determiner beide also receives Card. A personal possessive's person
is the possessor's person. mein, dein, and sein require number[psor] Sing;
unser and euer require number[psor] Plur. Resolve gender[psor] only when context
establishes it; in particular, Er ... seinen establishes gender[psor] Masc.
Formal possessive Ihr has person 2 and polite Form, and retains uppercase
canonicalForm Ihr. Ordinary dein does not receive polite. Do not infer foreign
or extPos merely from context. A nullable field is still mandatory in its
selected schema object: null means that the feature value is absent, not that
the field is optional. Keep all unsupported or unestablished features null.

surfaceFeatures must be null unless the attested form is archaic; then emit
{"historicalStatus":"Archaic"}. realizationCoverage is Partial only when some
lexical material of the complete determiner Lemma is absent.

Final self-check before returning: normalizedMembers must preserve the target's
contextual inflection; if normalization repairs any marked character, the
corresponding memberOrthographies value must be Typo; and do not copy
lemma.canonicalForm into normalizedMembers unless it actually is the normalized
contextual form.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-det-demo-definite-article-der",
	"grammar-de-det-demo-possessive-meinem",
	"grammar-de-det-demo-possessive-eurem",
	"grammar-de-det-demo-citation-irgendein",
	"grammar-de-det-demo-standalone-jener",
	"grammar-de-det-demo-unresolved-relative-der",
	"grammar-de-det-demo-unresolved-fusion-zum",
	"grammar-de-det-demo-unresolved-overbroad-dieser-alte",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
