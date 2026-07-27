import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "wupp",

	surface: {
		language: "de",
		normalizedFullSurface: "wupp",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "wupp",
			lemmaKind: "Lexeme",
			lemmaSubKind: "INTJ",
			inherentFeatures: {},
			meaningInEmojis: "💥",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Fort geht nun die Mutter und
[wupp]! den Daumen in den Mund.
`,
	classifierNotes:
		"Wupp looks like an exclamatory sound-effect item, so I treated it as a plain interjection. I did not model it as a discourse formula because there is no larger fixed phrase to recover, and I did not force `partType: Res` because this is an expressive exclamation rather than a response particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
