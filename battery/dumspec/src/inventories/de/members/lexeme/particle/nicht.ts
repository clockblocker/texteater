import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

// nicht is a PART with polarity Neg, never an ADV, whatever it negates (Rule
// de/nicht-is-part). Duden classes it as a Partikel; its one Reading is
// negation. Dialect spellings (nich, nit, nedd) are Regional Variant
// Surfaces of this Lemma.
// https://www.duden.de/rechtschreibung/nicht_keineswegs_nein
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PART",
	canonicalForm: "nicht",
	coreFeatures: {
		abbr: null,
		foreign: null,
		partType: null,
		polarity: "Neg",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🚫" }, lemma },
	knowledge: {
		transcription: "nɪçt",
		definition:
			"Drückt eine Verneinung aus, des ganzen Satzes oder eines einzelnen Satzteils: Er kommt nicht. Das ist nicht mein Problem. Nicht heute, sondern morgen.",
		translations: { en: ["not"], ru: ["не"] },
	},
	coverage: {
		transcription: "Authored",
		definition: "Authored",
		translations: { en: "Authored", ru: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "ReviewedEmpty",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
