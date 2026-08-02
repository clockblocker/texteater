import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../../assembly";
import { inputSchema, outputSchema } from "./schemas";

const body = `Segment the accepted German text into its authoritative ordered Segment
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
otherwise known-unresolvable material as OpaqueText instead of guessing.`;

const demonstrations = defineLocalDemonstrations({
	inputSchema,
	outputSchema,
	cases: [
		{
			input: { text: "Still, aber wach!" },
			idealOutput: {
				segments: [
					{ kind: "ResolvableText", text: "Still" },
					{ kind: "Punctuation", text: "," },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "aber" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "wach" },
					{ kind: "Punctuation", text: "!" },
				],
			},
		},
		{
			input: { text: "Wir treffen quux42 später." },
			idealOutput: {
				segments: [
					{ kind: "ResolvableText", text: "Wir" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "treffen" },
					{ kind: "Whitespace", text: " " },
					{ kind: "OpaqueText", text: "quux42" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "später" },
					{ kind: "Punctuation", text: "." },
				],
			},
		},
	],
});

export const promptSource = definePromptSource({
	route: "segmentation/de",
	inputSchema,
	outputSchema,
	body,
	demonstrations,
});
