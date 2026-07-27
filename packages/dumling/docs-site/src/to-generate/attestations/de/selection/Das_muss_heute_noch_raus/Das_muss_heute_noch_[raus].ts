import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "raus",

	surface: {
		language: "de",
		normalizedFullSurface: "raus",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "heraus",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Das muss heute noch [raus].",
	classifierNotes:
		"Raus is treated as the directional adverb with canonical lemma heraus. I did not fold it into a separable-verb analysis here, because the clause is elliptical and there is no overt finite verb like geht or muss-embedded infinitive host for a particle split.",
	isVerified: true,
} as const satisfies AttestedSelection;
