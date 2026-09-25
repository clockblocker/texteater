import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "euer",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: null,
		person: "2",
		polite: null,
		poss: "Yes",
		pronType: "Prs",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔐" }, lemma },
	knowledge: {
		transcription: "ˈɔɪ̯ɐ",
		definition:
			"Der Possessivartikel „euer“ ordnet den bezeichneten Gegenstand mehreren vertraut angesprochenen Personen zu.",
		translations: { en: ["your (plural)"], ru: ["ваш"] },
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
