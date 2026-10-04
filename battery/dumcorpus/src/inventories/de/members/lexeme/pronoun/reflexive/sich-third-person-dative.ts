import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "sich",
	coreFeatures: {
		person: "3",
		polite: null,
		poss: null,
		pronType: "Prs",
		case: "Dat",
		number: null,
		gender: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🪞" }, lemma },
	knowledge: {
		definition:
			"Das Reflexivpronomen „sich“ verweist in der dritten Person auf den Bezug des Subjekts zurück.",
		transcription: "zɪç",
		translations: { en: ["oneself"], ru: ["себе"] },
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
