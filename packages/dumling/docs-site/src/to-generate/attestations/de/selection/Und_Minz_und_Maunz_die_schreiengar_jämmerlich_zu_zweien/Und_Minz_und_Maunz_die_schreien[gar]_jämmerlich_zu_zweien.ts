import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "gar",

	surface: {
		language: "de",
		normalizedFullSurface: "gar",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "gar",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "📈",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
[gar] jämmerlich zu zweien`,
	classifierNotes:
		"Gar functions as an intensifier here. Dumling does not currently split German focus or degree particles into a separate subtype, so I classified it as ADV rather than PART.",
	isVerified: true,
} as const satisfies AttestedSelection;
