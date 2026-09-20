import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "wenig",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Ind",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "➖" }, lemma },
	knowledge: {
		transcription: "ˈveːnɪç",
		definition:
			"Der quantifizierende Determinierer „wenig“ grenzt die Menge der bezeichneten Bezüge ein.",
		translations: { en: ["little", "few"], ru: ["мало"] },
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
