import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "auf",

	surface: {
		language: "de",
		normalizedFullSurface: "auf",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "auf",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADP",
			inherentFeatures: {
				adpType: "Prep",
			},
			meaningInEmojis: "⬆️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Der hockte da im grünen Gras;
dem floß der Kaffee [auf] die Nas.`,
	classifierNotes:
		"`auf` heads the directional phrase `auf die Nas`, so I treated it as an ordinary preposition, not as a verbal particle. I left `governedCase` unset even though this local phrase is accusative, because the lemma `auf` is a two-way preposition and the Dumling schema stores that feature lexically rather than per attested token.",
	isVerified: true,
} as const satisfies AttestedSelection;
