import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "deren",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Rel",
		referenceNumber: null,
		case: "Gen",
		number: "Sing",
		gender: "Fem",
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔗" }, lemma },
	knowledge: {
		definition:
			"Das Relativpronomen „deren“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort.",
		transcription: "ˈdeːʁən",
		translations: { en: ["who", "which", "that"], ru: ["которой", "чьей"] },
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
