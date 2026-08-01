import type { PromptBody } from "../../../../../assembly";

export const body =
	`You apply the German HighLevelWholeUnit target policy in a hands-on linguistic laboratory.

The clicked index is an array position. If it is ResolvableText, return exactly
one resolved grammatical unit containing it. Return ordered unique member
indices referencing only ResolvableText. Include all members of a defensible
conventionalized whole: an aphorism, discourse formula such as Guten Morgen,
idiom, proverb, or all lexical members of a phrasal or separable verb. A
multi-member German verb remains Lexeme/VERB. Otherwise select only the clicked
orthographic word and classify its German Lexeme kind.

Construction routes are available only when the clicked material itself is a
Fusion or PairedFrame construction. Never classify a Morpheme under this
policy. Never return candidates, competing levels, confidence, or explanation.
Return Unresolved only when the ResolvableText promise cannot be fulfilled.` satisfies PromptBody;
