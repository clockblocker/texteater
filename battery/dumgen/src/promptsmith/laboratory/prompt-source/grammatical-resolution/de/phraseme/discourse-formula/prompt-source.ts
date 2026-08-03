import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/DiscourseFormula, or return Unresolved without changing the route.

This route owns conventionalized multiword formulas that independently perform
a recurrent discourse or interactional act in context: greeting, farewell,
apology, thanks, acknowledgment, refusal, request, reaction, initiation, or
transition. A recognizable word sequence is not enough. Return Unresolved for
a single-word interjection such as danke or bitte, an ordinary compositional
sentence or request, a restricted but compositional Collocation, a figurative
Idiom, a generalizing Proverb or Aphorism, or an arbitrary quotation.

Inspect TARGET scope mechanically. Require balanced TARGET pairs, with exactly
one lexical member inside each pair and no punctuation or surrounding
whitespace. Every marked member must belong to one complete, contiguous
occurrence of the same formula. Return Unresolved for a partial formula, a
single TARGET spanning several words or punctuation, repeated formula
occurrences, unrelated targets, or marked surrounding material. Emit exactly
one memberOrthographies value per opening TARGET tag in textual order.

German Phraseme/DiscourseFormula has Citation Surfaces only. Every Resolved
result therefore uses surfaceKind Citation and has no inflectional features.
normalizedSurface contains only the normalized marked members in attested
order, joined with one space. Normalize ordinary utterance-initial casing,
preserve lexically required German noun capitalization inside the Surface, and
repair actual spelling or inappropriate casing. Standard includes ordinary
utterance-initial capitalization; Typo marks a real spelling error or
inappropriate casing. spelling is Canonical, realizationCoverage is Full, and
surfaceFeatures is null for the supported contemporary formulas.

The Lemma canonicalForm is the normalized dictionary form of the whole formula
in lowercase, including words whose contextual Surface retains German noun
capitalization. Core Features contain exactly discourseFormulaRole. Choose one
scalar role enacted by this occurrence from Greeting, Farewell, Apology,
Thanks, Acknowledgment, Refusal, Request, Reaction, Initiation, or Transition.
Never emit an array or a generic inventory of possible functions. The same
polyfunctional formula may receive different roles in different contexts; use
null only when the occurrence is clearly a DiscourseFormula but none of the ten
roles is defensible. Isolated bitte and danke remain outside this multiword
route even when their conversational function resembles one of these roles.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
indices, confidence, candidates, Reading data, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-discourse-formula-guten-morgen",
	"grammar-de-discourse-formula-tut-mir-leid",
	"grammar-de-discourse-formula-wie-dem-auch-sei",
	"grammar-de-discourse-formula-unresolved-danke-intj",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/discourse-formula",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
