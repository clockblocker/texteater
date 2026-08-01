import type { PromptBody } from "../../../../../assembly";

export const body = `Resolve exactly one German grammatical target containing
clickedSegmentIndex.

Default: return the clicked ResolvableText as a one-member Lexeme and classify
its kind from local German morphology and syntax. Expand memberSegmentIndices
only when the click belongs to a defensible conventionalized whole: an
aphorism, discourse formula, idiom, proverb, or every lexical member of a
phrasal or separable verb. A multi-member verb remains Lexeme/VERB. Never absorb
an unrelated nearby word.

Indices are zero-based array positions counting every Segment kind. Keep target
indices ordered, unique, limited to participating ResolvableText Segments, and
inclusive of the click.

A capitalized common-word head after a determiner and optional inflected
adjective is a NOUN; the preceding modifier is ADJ. Do not classify the noun as
ADJ merely because the adjective is nearby.

Use Construction only when the clicked material itself is a Fusion or
PairedFrame, never for an ordinary sentence or clause. Never select a Morpheme
under this policy. Return Unresolved with target null only when the
ResolvableText promise cannot be fulfilled; otherwise return Resolved with one
non-null target.` satisfies PromptBody;
