import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "jeglicher",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Tot",
		referenceNumber: null,
		case: null,
		number: null,
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🌐" }, lemma },
	knowledge: {
		definition:
			"Das gehoben wirkende Totalpronomen „jeglicher“ bezeichnet jedes einzelne Mitglied einer Gruppe und kann auch pluralisch gebraucht werden.",
		transcription: "ˈjeːklɪçɐ",
		translations: {
			en: ["each", "any", "every one"],
			ru: ["всякий", "любой"],
		},
		semanticRelations: {
			targetKind: "lemma",
			synonym: [
				{
					language: "de",
					family: "Lexeme",
					kind: "PRON",
					canonicalForm: "jeder",
					coreFeatures: {
						extPos: null,
						foreign: null,
						person: null,
						polite: null,
						poss: null,
						pronType: "Tot",
						referenceNumber: null,
						case: null,
						number: null,
						gender: null,
						"gender[psor]": null,
					},
					unitKind: "Lemma",
				},
			],
		},
	},
	coverage: {
		transcription: "Authored",
		definition: "Authored",
		translations: { en: "Authored", ru: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "Authored",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
