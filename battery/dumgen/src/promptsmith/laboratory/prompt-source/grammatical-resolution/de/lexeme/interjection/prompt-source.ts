import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/INTJ, or
return Unresolved without changing the route.

Resolve only when every TARGET pair marks lexical material belonging to one
identifiable single-word interjection Lexeme. Multiple TARGET pairs are allowed
only when all are members of that same lexical realization. Return Unresolved
when a target is a particle, adverb, nominalized expression, another route, a
member of a larger fixed discourse formula, or contains punctuation or other
non-lexical material. Do not detach ja from na ja or o from o wei: those larger
meaning-bearing units belong to a Phraseme route. Expressive sound words such as
wupp may be interjections when they independently form the exclamation. An
interjection can also stand parenthetically inside a larger sentence; nearby
unmarked discourse material does not become part of its lexical realization.
Conversely, a marked form used as a noun under a possessive or adjective is a
nominalized expression and remains outside INTJ.

Count literal opening <TARGET> tags, not words or characters. Emit exactly one
memberOrthographies value per opening tag in textual order. Typo means an actual
spelling error. Standard includes canonical spelling, licensed variants, and
ordinary sentence-initial capitalization. Normalize ordinary casing without
calling it a Typo. Repair only spelling errors and ordinary casing; never
replace the marked interjection with a synonym or expand it into a formula.
Except for ordinary sentence-initial casing, if normalizedMembers changes any
marked character to repair a spelling, the corresponding memberOrthographies
value must be Typo; Standard is not permitted merely because the repaired
dictionary form is canonical.

German Lexeme/INTJ has Citation Surfaces only. Every Resolved result therefore
uses surfaceKind Citation, even for an interjection used inside an ordinary
sentence; never invent an Inflection Surface or inflectional features.
normalizedMembers is the normalized contextual interjection. spelling is
Canonical for the canonical spelling and Variant only for a licensed written
variant such as expressive lengthening. Licensed lengthening repeats sounds
while preserving the canonical character sequence; deletion, transposition, or
substitution is a Typo, even when the result resembles expressive spelling.
realizationCoverage is Full for an
independent complete interjection. A clipped or partial string that does not
defensibly identify the Lexeme is Unresolved. surfaceFeatures is null unless the
attested Surface is archaic; then emit {"historicalStatus":"Archaic"}.

The Lemma canonicalForm is the normalized dictionary form of the same Lexeme.
coreFeatures.partType is "Res" only for an answer or response interjection such
as standalone ja, nein, or corrective doch. In particular, a one-word doch
answer contradicting a negative yes/no question is a Res interjection, while
doch inside the proposition as a modal particle is outside this route.
Expressive, emotive, hesitation,
greeting, prompting, and sound-effect interjections use null. The same spelling
used as a modal or discourse particle is outside this route, not an INTJ with a
different feature. Resolved has a non-null resolution; Unresolved has resolution
null.`;

export const demonstrations = corpus.select([
	"grammar-de-intj-demo-pfui-expressive",
	"grammar-de-intj-demo-ja-response",
	"grammar-de-intj-demo-hmm-variant",
	"grammar-de-intj-demo-o-wei-phraseme-boundary",
	"grammar-de-intj-demo-punctuation-in-target",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/interjection",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
