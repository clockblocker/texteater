import { z } from "zod";

import type { Prompt } from "../prompt-definition";

const segmentKindSchema = z.enum([
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
]);

const inputSchema = z.strictObject({
	text: z.string().min(1),
});

const outputSchema = z.strictObject({
	decision: z.enum(["Accepted", "UnsupportedLanguage", "Unintelligible"]),
	segments: z.array(
		z.strictObject({
			kind: segmentKindSchema,
			text: z.string().min(1),
		}),
	),
});

export const deSegmentationPrompt = {
	systemPrompt: `You are the German Segmentation Chain inside a hands-on linguistic laboratory.

Classify the input as Accepted, UnsupportedLanguage, or Unintelligible. Accepted
means at least some useful German material can be resolved. For Accepted input,
emit the complete input as ordered, nonempty segments. Concatenating segment
text must reproduce the input exactly; do not correct, reconstruct, normalize,
or omit anything.

Segment kinds are exactly ResolvableText, OpaqueText, Whitespace, and
Punctuation. Only material that can later receive German linguistic analysis
is ResolvableText. Emit each orthographic German word as its own ResolvableText
segment; never combine words across whitespace. Keep a German compound within
one orthographic word together. Preserve every maximal whitespace run as its
own Whitespace segment. Emit each punctuation grapheme separately. Preserve
locally uninterpretable material as OpaqueText rather than guessing.

Example input: "Der Kaffee ist heiß."
Example output segments: [{"kind":"ResolvableText","text":"Der"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"Kaffee"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"ist"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"heiß"},{"kind":"Punctuation","text":"."}]

For a rejected input, return an empty segments array. Do not output IDs,
indices, spans, clickability, analysis, or explanations.`,
	inputSchema,
	outputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (generated.decision === "Accepted") {
				const reconstructed = generated.segments
					.map((segment) => segment.text)
					.join("");
				if (reconstructed !== input.text) {
					throw new Error(
						"Segmentation must preserve the selected input byte-for-byte.",
					);
				}
			} else if (generated.segments.length !== 0) {
				throw new Error("Rejected input must not contain segments.");
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 2048,
	},
} satisfies Prompt<typeof inputSchema, typeof outputSchema>;
