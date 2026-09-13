import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "sollen",
	coreFeatures: {
		verbType: "Mod",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "📋" }, lemma },
	knowledge: {
		definition:
			"Das Modalauxiliar „sollen“ modifiziert die Geltung oder Möglichkeit einer Handlung.",
		translations: { en: ["should"] },
	},
	coverage: {
		transcription: "Unauthored",
		definition: "Authored",
		translations: { en: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "ReviewedEmpty",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
