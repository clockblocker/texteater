import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Target Classification has already fixed this request to German
Phraseme/Aphorism and supplied the marked fixed members. Resolve the Surface
and Lemma grammar for that fixed route. Do not require the exact wording to be
familiar, recall an author or collection, or reconstruct a source citation:
those are not fields of Grammatical Resolution. Unfamiliarity with the wording
is not evidence for Unresolved.

An Aphorism is a conventional, self-contained, concisely formulated authored
maxim or observation circulated as a whole utterance. Before constructing any
Resolved output, look only for hard contradiction evidence that is observable
in this input:

- unmarked context explicitly labels the marked wording as a Collocation or
  Funktionsverbgefüge, a traditional Proverb, a merely episodic observation,
  drama or scene-bound dialogue, or ordinary direct speech;
- the marked words visibly fill a phrase slot inside a larger unmarked clause
  as an Idiom or Collocation rather than form the whole utterance; or
- target scope is partial, includes an attribution, or punctuation separates
  the marked members into multiple complete units.

Hard contradiction evidence is decisive: return Unresolved immediately and do
not apply the fixed-route default. If none of those observable conditions is
present, the upstream Phraseme/Aphorism route and marked membership are
authoritative: return Resolved and construct the Citation Surface and Lemma.
Do not invent a contradiction from the marked wording's style or content.

Do not ask again whether the wording is an established Aphorism. Lack of
recognition, recalled authorship, or independent attestation is never a reason
for Unresolved.

A positive route contradiction exists only when the input supplies the hard
evidence above. Do not infer a wrong route merely because you cannot
independently attest the wording.

The input has already been structurally validated so that every TARGET pair
identifies exactly one word-like ResolvableText member. TARGET membership is
therefore authoritative: emit one memberOrthographies value per marked member
in textual order. A positive target-scope contradiction exists when the marked
members are not all and only the fixed members of one complete Aphorism:
return Unresolved for a partial quotation, an appended author attribution, or
members spanning two aphorisms. Never repair target scope or return Partial
coverage.

This route is Citation-only under the current Dumling codec. Every Resolved
result has surfaceKind Citation, realizationCoverage Full, and no
inflectionalFeatures. surfaceFeatures is null unless the grammatical use itself
is archaic; historical spelling alone does not make it archaic. The complete
Lemma coreFeatures object is exactly {}.

normalizedMembers contains exactly one normalized string per marked fixed member
in order, without leading, trailing, or repeated whitespace. It excludes all
unmarked punctuation and surrounding
quotation marks. Repair a real spelling or inappropriate-casing error and mark
only that member Typo. In particular, when the complete maxim begins with
lowercase die, normalize it to Die in normalizedMembers and canonicalForm and
mark that first member Typo. An attested uppercase initial at the beginning of
the maxim is ordinary sentence-initial capitalization and remains Standard.
Licensed historical spelling is also Standard. Preserve a licensed historical
spelling in normalizedMembers and use spelling Variant; use the current
conventional wording for canonicalForm. Otherwise spelling is Canonical. Never
insert, remove, reorder, or lemmatize fixed members.

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
