import type { PromptBody } from "../../../../assembly";

export const body =
	`Segment the accepted German text into its authoritative ordered Segment
sequence.

Default: emit each German orthographic word as one ResolvableText Segment, each
maximal whitespace run as one Whitespace Segment, and each punctuation
grapheme as its own Punctuation Segment. Never combine words across whitespace;
keep an orthographic German compound together.

Preserve ordinary typos and licensed spelling variants exactly as attested.
Only severe but intelligible structural corruption may be conservatively
reconstructed, and only to repair structural word boundaries. Never normalize
spelling, expand abbreviations, lemmatize, or resolve lexical identity.

ResolvableText promises that downstream German classification can resolve the
material defensibly. Preserve non-primary-language, locally uninterpretable, or
otherwise known-unresolvable material as OpaqueText instead of guessing.` satisfies PromptBody;
