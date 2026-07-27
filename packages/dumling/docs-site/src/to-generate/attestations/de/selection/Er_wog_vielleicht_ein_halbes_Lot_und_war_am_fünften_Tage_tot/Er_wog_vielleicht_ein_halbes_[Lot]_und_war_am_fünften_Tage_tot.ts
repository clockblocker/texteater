import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Lot",

	surface: {
		language: "de",
		normalizedFullSurface: "Lot",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Lot",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "⚖️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes [Lot] –
und war am fünften Tage tot.
`,
	classifierNotes:
		"I treated Lot as the neuter weight unit and annotated the noun as accusative singular because it is the measure complement of wog. The bare noun form itself is syncretic with the citation form, so the case decision comes from the clause, not from overt noun morphology.",
	isVerified: true,
} as const satisfies AttestedSelection;
