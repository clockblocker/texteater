import type { AttestedSelection, Selection } from "dumling/types";

const emailVariantSelection = {
	language: "en",
	selectionFeatures: { spelling: "Variant" },
	spelledSelection: "e-mail",

	surface: {
		language: "en",
		normalizedFullSurface: "e-mail",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "email",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "✉️",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: emailVariantSelection,
	sentenceMarkdown: "Send the [e-mail] before noon.",
	classifierNotes:
		"Hyphenated e-mail is a standard variant of email, not a typo.",
} as const satisfies AttestedSelection;
