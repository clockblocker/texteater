import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "keiner",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Neg",
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
	reading: { ...{ unitKind: "Reading", emojiDescription: "🚫" }, lemma },
	knowledge: {
		definition:
			"Das Negativpronomen „keiner“ verneint die Zugehörigkeit zu einer im Kontext bestimmten Menge und kann sich auf Personen oder Sachen beziehen.",
		translations: { en: ["none", "no one"] },
		semanticRelations: {
			targetKind: "lemma",
			nearSynonym: [
				{
					language: "de",
					family: "Lexeme",
					kind: "PRON",
					canonicalForm: "niemand",
					coreFeatures: {
						extPos: null,
						foreign: null,
						person: null,
						polite: null,
						poss: null,
						pronType: "Neg",
						referenceNumber: null,
						case: "Nom",
						number: "Sing",
						gender: null,
						"gender[psor]": null,
					},
					unitKind: "Lemma",
				},
				{
					language: "de",
					family: "Lexeme",
					kind: "PRON",
					canonicalForm: "nichts",
					coreFeatures: {
						extPos: null,
						foreign: null,
						person: null,
						polite: null,
						poss: null,
						pronType: "Neg",
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
		transcription: "Unauthored",
		definition: "Authored",
		translations: { en: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "ReviewedEmpty",
			nearSynonym: "Authored",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
