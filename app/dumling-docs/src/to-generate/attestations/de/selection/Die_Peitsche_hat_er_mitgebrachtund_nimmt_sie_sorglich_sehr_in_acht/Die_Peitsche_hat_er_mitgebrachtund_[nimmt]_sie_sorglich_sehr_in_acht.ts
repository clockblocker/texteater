import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "nimmt",

	surface: {
		language: "de",
		normalizedFullSurface: "in acht nehmen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "in acht nehmen",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er mitgebracht
und [nimmt] sie sorglich sehr in acht.`,
	classifierNotes:
		"The clause uses the fixed expression in acht nehmen, so the finite verb token is treated as a partial selection of the idiom rather than as a standalone nehmen inflection.",
	isVerified: true,
} as const satisfies AttestedSelection;
