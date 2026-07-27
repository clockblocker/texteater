import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "tot",

	surface: {
		language: "de",
		normalizedFullSurface: "tot",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "tot",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "💀",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und war am fünften Tage [tot].
`,
	classifierNotes:
		"Predicative tot is stored as a citation-shaped adjective because there is no overt inflection on the selected form.",
	isVerified: true,
} as const satisfies AttestedSelection;
