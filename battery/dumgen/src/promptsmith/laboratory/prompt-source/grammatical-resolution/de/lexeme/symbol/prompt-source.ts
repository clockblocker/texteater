import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/SYM,
or return Unresolved without changing the route.

Resolve only when the TARGET markup isolates exactly one occurrence of one
symbol Lexeme. A symbol is a graphically symbolic entity such as a mathematical
operator, unit or currency sign, technical mark, or emotive symbol. A symbol can
contain multiple Unicode code points, as in :-), while still being one token.
Require one balanced TARGET pair. Return Unresolved for multiple occurrences,
unrelated targets, or a target that combines the symbol with a number,
punctuation, word, or other dependent.

Use the marked context, not visual shape alone. Commas, periods, exclamation
marks, quotation marks, and dashes that organize written syntax are PUNCT.
Digits denoting quantities are NUM. Written words such as Prozent and Euro are
NOUN, and written function words such as und are their own lexical routes.
Glyphs embedded as inseparable components of names such as Disney+ are PROPN
material, not independent SYM occurrences. Standalone emoji and emoticons are
SYM when they function as emotive symbols; punctuation adjacent to an emoji is
not part of that symbol. An ASCII x used as a multiplication sign can be SYM,
but preserve x rather than rewriting it as ×.

Emit exactly one memberOrthographies value for the one opening TARGET tag.
Standard is the exact conventional glyph or character sequence. Typo is not a
license to substitute visually similar symbols or normalize one glyph identity
to another. If a damaged or ambiguous glyph cannot be repaired without guessing
its identity, return Unresolved. normalizedSurface and Lemma canonicalForm
normally preserve the exact conventional symbol sequence.

Use Citation for an ordinary invariant symbolic occurrence. Use Inflection only
when the marked symbol is explicitly used nominally and surrounding German
agreement establishes at least one of case, gender, or number. An unchanged
glyph can have an Inflection Surface: the distinction records contextual
grammar, not a visible suffix. Fill only established values and keep unknown
values null. Never emit an all-null inflectionalFeatures object. Citation never
has inflectionalFeatures.

surfaceFeatures is null unless the attested symbolic use is archaic, when it is
{"historicalStatus":"Archaic"}. The authoritative Core for ordinary German
symbols is {"foreign":null,"numType":null}. Do not infer Foreign from an
international glyph. Do not assign NumType merely because a symbol occurs near
a number or expresses an operation, proportion, or range. German GSD attests no
SYM NumType, so Card and Range remain unsupported policy probes rather than
ordinary resolved values.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-sym-percent-unit-citation",
	"grammar-de-sym-times-nominal-inflection",
	"grammar-de-sym-punctuation-comma",
	"grammar-de-sym-overbroad-five-percent",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/symbol",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
