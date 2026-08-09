import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `This is the German Lexeme/X Grammatical Resolution diagnostic
route. Under the current Dumgen domain policy it has no reachable successful
analysis. Always return {"decision":"Unresolved","resolution":null} without
changing the route or constructing a Surface or Lemma.

The reason is upstream ownership, not an invitation to broaden X. A German
ResolvableText Segment promises that the downstream chain can resolve it
defensibly. Universal Dependencies reserves X mainly for unintelligible
material, word fragments, and wholly unanalyzed foreign material. In current
Dumgen, unintelligible material and fragments are OpaqueText, and Intake plus
Segmentation preserve every non-primary-language span as OpaqueText. Issue #19
deliberately defers multilingual and code-switched click routing. None of those
legitimate UD X families can therefore reach this German grammatical route.

Do not reproduce noisy German GSD X assignments. An ordinary German word,
recoverable typo, established loan, abbreviation, or morphologically odd but
intelligible word stays on its informative lexical route. Names are PROPN;
interjections are INTJ; numeric expressions are NUM; conventional marks are
SYM; and sentence punctuation is PUNCT. Email addresses, opaque alphanumeric
codes, punctuation-only placeholders, gibberish, and truncated fragments are
not X Lemmas. They remain upstream OpaqueText or another Segment kind.

This rejection also applies when exactly one balanced TARGET pair happens to
mark one legible token. It applies to multiword, repeated, unrelated,
overbroad, and unbalanced targets as well. Never translate, transliterate,
repair, lowercase, lemmatize, or infer Core Features on this route. A
recoverable spelling or casing normalization belongs to the target's real
lexical route; without a reachable X identity, inventing normalizedMembers or
canonicalForm would invent a Lemma.

The model schema still mirrors Dumling's dormant German X contract, including
Citation and structurally non-null Inflection Surface alternatives. Those
shapes are retained for type fidelity and a future domain decision, but they
are unreachable outputs under the current policy. Return only the Unresolved
object and no explanations or extra fields.`;

export const demonstrations = corpus.select([
	"grammar-de-x-unresolved-opaque-english-green",
	"grammar-de-x-unresolved-typo-kaffe",
	"grammar-de-x-unresolved-noun-computer",
	"grammar-de-x-unresolved-gibberish-xqzv",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/other",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
