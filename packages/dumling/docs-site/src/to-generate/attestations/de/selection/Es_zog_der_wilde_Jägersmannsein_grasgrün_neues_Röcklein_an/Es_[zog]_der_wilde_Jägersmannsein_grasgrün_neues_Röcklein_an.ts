import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "zog",

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
	sentenceMarkdown: `Es [zog] der wilde Jägersmann
	sein grasgrün neues Röcklein an;`,
	classifierNotes:
		"This is the finite part of the separable verb `anziehen`, so the selection is Partial while `normalizedFullSurface` keeps the full attested verb surface `zog an`.",
	isVerified: true,
} as const satisfies AttestedSelection;
