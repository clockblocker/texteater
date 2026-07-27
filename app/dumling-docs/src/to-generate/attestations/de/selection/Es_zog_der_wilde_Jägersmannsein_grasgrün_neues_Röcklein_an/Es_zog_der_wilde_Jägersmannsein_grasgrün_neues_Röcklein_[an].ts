import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "an",

	surface: {
		language: "de",
		normalizedFullSurface: "zog an",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "anziehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasSepPrefix: "an",
			},
			meaningInEmojis: "🧥",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Es zog der wilde Jägersmann
	sein grasgrün neues Röcklein [an];`,
	classifierNotes:
		"The detached prefix token is still classified against the same separable verbal surface `zog an`, following the existing Dumling pattern for split verbs like `pass auf`.",
	isVerified: true,
} as const satisfies AttestedSelection;
