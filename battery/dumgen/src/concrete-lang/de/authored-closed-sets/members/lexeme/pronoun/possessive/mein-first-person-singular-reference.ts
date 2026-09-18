import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "mein",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "1",
		polite: null,
		poss: "Yes",
		pronType: "Prs",
		referenceNumber: "Sing",
		case: null,
		number: null,
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔑" }, lemma },
	knowledge: {
		definition:
			"Das substantivische Possessivpronomen „mein“ bezeichnet etwas, das die sprechende Einzahl zugeordnet ist.",
		transcription: "maɪ̯n",
		translations: { en: ["mine"], ru: ["мой"] },
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
