import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Target Classification has already fixed this request to German
Phraseme/Proverb and supplied the marked lexical members. Resolve the Surface
and Lemma grammar for that fixed route. Do not require the exact wording to be
familiar, recall a dictionary entry, or reconstruct a source citation: those
are not fields of Grammatical Resolution. Unfamiliarity with the wording is not
evidence for Unresolved.

A Proverb is a conventional sentence-valued saying that circulates as a whole
unit and expresses a general observation, rule, or piece of traditional
wisdom. It may be elliptical or figurative. Apply this decision procedure in
order:

1. Look only for positive evidence in the marked context that the fixed route
   is contradicted, or that target scope is incomplete, overbroad, or spans
   multiple units.
2. If such evidence exists, return Unresolved.
3. Otherwise the upstream Phraseme/Proverb route and marked membership remain
   authoritative: return Resolved and construct the Citation Surface and Lemma.

Do not ask again whether the wording is an established Proverb. Lack of
recognition, recalled provenance, or independent attestation is never a reason
for Unresolved.

A positive route contradiction exists when the context explicitly identifies
the marked material as an authored Aphorism, when it instead fills a clause
role as an evident figurative Idiom or non-idiomatic Collocation, when it
performs a local interactional act as a DiscourseFormula, or when it is plainly
an ordinary episodic sentence or arbitrary quotation. A named speaker quoting
a proverb does not change its route, and an authored historical origin alone
does not prove Aphorism status. Do not infer a wrong route merely because you
cannot independently attest the wording.

The input has already been structurally validated so that every TARGET pair
identifies exactly one word-like ResolvableText member. TARGET membership is
therefore authoritative: emit one memberOrthographies value per marked member
in textual order. A positive target-scope contradiction exists when the marked
members are not all and only the lexical members of one complete Proverb:
return Unresolved for a partial saying, an appended speaker attribution, or
members spanning two proverbs. Never repair target scope or return Partial
coverage.

This route is Citation-only under the current Dumling codec. Every Resolved
result has surfaceKind Citation, realizationCoverage Full, and no
inflectionalFeatures. surfaceFeatures is null unless the grammatical use itself
is archaic; historical spelling alone does not make it archaic. The complete
Lemma coreFeatures object is exactly {}.

normalizedSurface is the normalized space-separated projection of the marked
lexical members in order. It excludes all unmarked internal and terminal
punctuation, surrounding quotation marks, and reporting context. Repair a real
spelling or inappropriate-casing error and mark only that member Typo.
Ordinary sentence-initial capitalization and licensed historical spelling are
Standard. Use spelling Variant only for a licensed orthographic form of the
same lexical wording and use the current conventional wording for
canonicalForm. Do not silently turn shortened forms or lexical component
replacements into a preferred proverb. Otherwise spelling is Canonical. Never
insert, remove, reorder, or lemmatize lexical members.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, source citations, or
explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-proverb-morgenstund",
	"grammar-de-proverb-typo-anfank",
	"grammar-de-proverb-was-heute",
	"grammar-de-proverb-unresolved-aphorism-alter",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/phraseme/proverb",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
