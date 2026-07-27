import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "fünften",

	surface: {
		language: "de",
		normalizedFullSurface: "fünften",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "fünfte",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {
				numType: "Ord",
			},
			meaningInEmojis: "5️⃣",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und war am [fünften] Tage tot.
`,
	classifierNotes:
		"Fünften is the dative masculine singular inflected form of the ordinal adjective fünfte in the temporal phrase am fünften Tage, so I modeled it as ADJ with ordinal number features rather than as a cardinal numeral.",
	isVerified: true,
} as const satisfies AttestedSelection;
