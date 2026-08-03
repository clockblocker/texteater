import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of exactly one marked German
Phraseme/Aphorism, or return Unresolved without changing the route.

An Aphorism is a conventional, self-contained, concisely formulated authored
maxim or observation circulated as a whole utterance. Resolve only with strong
evidence that the complete marked wording is one established Aphorism. A
traditional anonymous generalization is a Proverb; a conventional figurative
expression is an Idiom; a conventional non-idiomatic lexical combination is a
Collocation. Direct speech, an arbitrary quotation, a memorable line from a
larger dramatic or narrative context, and an ordinary sentence are not
Aphorisms merely because they are quotable or express a general thought.

TARGET markup represents exact whole-unit membership. Every participating
ResolvableText member has its own balanced <TARGET>...</TARGET> pair, including
repeated words, and memberOrthographies has exactly one value per opening pair
in textual order. Whitespace, quotation marks, commas, dashes, and terminal
punctuation are not members and must remain outside TARGET tags. Resolve only
when all and only the lexical members of one complete Aphorism are marked.
Return Unresolved for a partial quotation, an appended author attribution, a
targeted punctuation mark, members spanning two aphorisms, an empty member, or
unbalanced markup. Never repair target scope or return Partial coverage.

This route is Citation-only under the current Dumling codec. Every Resolved
result has surfaceKind Citation, realizationCoverage Full, and no
inflectionalFeatures. surfaceFeatures is null unless the grammatical use itself
is archaic; historical spelling alone does not make it archaic. The complete
Lemma coreFeatures object is exactly {}.

normalizedSurface is the normalized space-separated projection of the marked
lexical members in order. It excludes all unmarked punctuation and surrounding
quotation marks. Repair a real spelling or inappropriate-casing error and mark
only that member Typo. Ordinary sentence-initial capitalization and licensed
historical spelling are Standard. Preserve a licensed historical spelling in
normalizedSurface and use spelling Variant; use the current conventional
wording for canonicalForm. Otherwise spelling is Canonical. Never insert,
remove, reorder, or lemmatize lexical members.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, authorship metadata,
source citations, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-aphorism-alt-werden",
	"grammar-de-aphorism-typo-hoert",
	"grammar-de-aphorism-historical-muss",
	"grammar-de-aphorism-unresolved-proverb",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/aphorism",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
