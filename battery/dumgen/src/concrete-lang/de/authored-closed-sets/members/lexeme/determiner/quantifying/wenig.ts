import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "wenig",
	coreFeatures: {
		case: null,
		definite: null,
		extPos: null,
		foreign: null,
		gender: null,
		number: null,
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
			"Der quantifizierende Determinierer „wenig“ grenzt die Menge der bezeichneten Bezüge ein. Die unflektierte Form steht vor einem Nomen im Singular (wenig Zeit); „weniger“ ist ihr Komparativ.",
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
