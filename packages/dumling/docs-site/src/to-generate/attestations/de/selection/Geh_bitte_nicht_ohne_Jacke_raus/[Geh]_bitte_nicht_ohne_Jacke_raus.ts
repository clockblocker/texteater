import type { AttestedSelection, Selection } from "dumling/types";

const deSelection025 = {
	language: "de",
	spelledSelection: "Geh",

	surface: {
		language: "de",
		normalizedFullSurface: "geh",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "gehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🚶",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection025,
	sentenceMarkdown: "[Geh] bitte nicht ohne Jacke raus.",
	classifierNotes:
		"Imperative forms use mood Imp together with finite verbForm in the schema.",
	isVerified: true,
} as const satisfies AttestedSelection;
