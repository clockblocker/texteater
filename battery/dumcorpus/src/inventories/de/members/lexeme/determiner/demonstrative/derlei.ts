import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "derlei",
	coreFeatures: {
		case: null,
		gender: null,
		number: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Dem",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👉" }, lemma },
	knowledge: {
		transcription: "ˈdeːɐ̯laɪ̯",
		definition:
			"Der Demonstrativartikel „derlei“ hebt einen bestimmten Bezug hervor.",
		translations: { en: ["this kind of"], ru: ["такого рода"] },
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
};
