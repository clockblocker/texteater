import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Einst",

	surface: {
		language: "de",
		normalizedFullSurface: "einst",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "einst",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "🕰️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `[Einst] ging er an Ufers Rand
mit der Mappe in der Hand.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
