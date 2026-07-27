import type { AttestedSelection, Selection } from "dumling/types";

const deSelection053 = {
	language: "de",
	selectionFeatures: { orthography: "Typo", spelling: "Variant" },
	spelledSelection: "Filosofie",

	surface: {
		language: "de",
		normalizedFullSurface: "Filosofie",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Philosophie",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "📚",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection053,
	sentenceMarkdown: "Im Heft stand [Filosofie] statt Philosophie.",
	classifierNotes:
		"This is a typo attestation whose noncanonical spelling still points to the canonical lemma Philosophie.",
	isVerified: true,
} as const satisfies AttestedSelection;
