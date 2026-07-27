import type { AttestedSelection, Selection } from "dumling/types";

const dichReflexivePronounSelection = {
	language: "de",
	spelledSelection: "dich",

	surface: {
		language: "de",
		normalizedFullSurface: "dich",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
			reflex: "Yes",
		},
		lemma: {
			language: "de",
			canonicalLemma: "du",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				person: "2",
				pronType: "Prs",
			},
			meaningInEmojis: "👉",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: dichReflexivePronounSelection,
	sentenceMarkdown: "Pass auf [dich] auf!",
	classifierNotes:
		"Dich is the accusative second-person pronoun `du`, with reflexive use marked on the inflected surface; it is not part of `normalizedFullSurface`, which remains the verbal surface `pass auf` for the split verb tokens.",
	isVerified: true,
} as const satisfies AttestedSelection;
