import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German
Phraseme/DiscourseFormula, or return Unresolved without changing the route.

This route owns conventionalized multiword formulas that independently perform
a recurrent discourse or interactional act in context: greeting, farewell,
apology, thanks, acknowledgment, refusal, request, reaction, initiation, or
transition. The formula must independently enact that act in this occurrence;
a homographic phrase serving only as an ordinary constituent does not. Thus a
directly uttered gute Reise can enact a wish or farewell, while auf eine gute
Reise hoffen contains an attributive, compositional noun phrase and is
Unresolved. A recognizable word sequence is not enough. Return Unresolved for
a single-word interjection such as danke or bitte, an ordinary compositional
sentence or request, a restricted but compositional Collocation, a figurative
Idiom, a generalizing Proverb or Aphorism, or an arbitrary quotation.

The input has already passed the shared deterministic TARGET syntax preflight.
Decide semantic scope only. All present canonical lexical members of one
formula occurrence must be TARGET-marked, and every marked member must belong
to that same occurrence. If a present formula member is unmarked, the target
underselects the formula and is Unresolved; for example, marking only Schönen
while Tag remains present but unmarked is not a Full Surface. Also return
Unresolved for repeated occurrences, unrelated targets, or marked surrounding
material. For a Resolved result, emit exactly one memberOrthographies value per
literal TARGET pair in textual order. Never invent an orthography value for an
unmarked member or insert that member into normalizedSurface.

German Phraseme/DiscourseFormula has Citation Surfaces only. Every Resolved
result therefore uses surfaceKind Citation and has no inflectional features.
normalizedSurface is derived from only the marked contextual members in
attested order, joined with one space. Normalize ordinary utterance-initial
casing, repair actual spelling or inappropriate casing, and preserve required
German lexical noun capitalization such as Morgen, Wiedersehen, Dank, Reise,
or Güte. Do not blindly copy the lowercase Lemma canonicalForm into
normalizedSurface. Standard includes ordinary utterance-initial capitalization;
Typo marks a real spelling error or inappropriate casing. spelling is
Canonical, realizationCoverage is Full, and surfaceFeatures is null for the
supported contemporary formulas.

The Lemma canonicalForm is the normalized dictionary form of the whole formula
in lowercase, including words whose contextual Surface retains German noun
capitalization. Core Features contain exactly discourseFormulaRole. Under ADR
0002, Core Features participate in grammatical Lemma identity. Therefore the
same canonical form with Greeting and Reaction is two distinct grammatical
Lemmas; an occurrence supplies evidence for one identity and does not change a
single Lemma's role. Choose the one scalar identity established by context from
Greeting, Farewell, Apology, Thanks, Acknowledgment, Refusal, Request, Reaction,
Initiation, or Transition. Acknowledgment covers a conventional reply that
acknowledges another speaker's thanks, such as gern geschehen. Reaction covers
an expressive response to an event or situation, such as surprise or fright;
it does not subsume a conventional response to thanks. Never emit an array or a
context-free inventory. Use null only when the marked expression is clearly a
DiscourseFormula but no enum role is grammatically established. Return
Unresolved rather than guessing when formula identity itself is ambiguous.
Isolated bitte and danke remain outside this multiword route even when their
conversational function resembles a role.

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
