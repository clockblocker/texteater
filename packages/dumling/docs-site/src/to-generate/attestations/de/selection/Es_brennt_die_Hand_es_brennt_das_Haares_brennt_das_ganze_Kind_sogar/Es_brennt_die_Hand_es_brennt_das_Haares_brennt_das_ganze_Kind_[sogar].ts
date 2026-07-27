import type { AttestedSelection, Selection } from "dumling/types";

const sogarAdverbSelection = {
	language: "de",
	spelledSelection: "sogar",

	surface: {
		language: "de",
		normalizedFullSurface: "sogar",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "sogar",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "➕",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: sogarAdverbSelection,
	sentenceMarkdown: `Es brennt die Hand, es brennt das Haar,
es brennt das ganze Kind [sogar].`,
	classifierNotes:
		"Sogar is the scalar focus item here. The current dumling inventory does not give German focus particles a dedicated subtype, so I classified it as ADV rather than inventing a particle-specific analysis.",
	isVerified: true,
} as const satisfies AttestedSelection;
