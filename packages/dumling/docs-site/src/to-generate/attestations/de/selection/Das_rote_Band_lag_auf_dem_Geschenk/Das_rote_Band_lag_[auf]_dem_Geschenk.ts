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
	sentenceMarkdown: "Das rote Band lag [auf] dem Geschenk.",
	classifierNotes:
		"`auf` heads the ordinary locative prepositional phrase `auf dem Geschenk`, so it is a plain preposition, not part of the verb `liegen`. I left `governedCase` unset because `auf` is a two-way preposition and the schema stores that feature lexically rather than per attested token, even though this local phrase is dative.",
	isVerified: true,
} as const satisfies AttestedSelection;
