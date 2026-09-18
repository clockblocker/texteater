import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "die",
	coreFeatures: {
		definite: "Def",
		extPos: null,
		foreign: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Art",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👉" }, lemma },
	knowledge: {
		transcription: "diː",
		definition:
			"Der bestimmte Artikel „die“ kennzeichnet einen bestimmten Bezug.",
		translations: { en: ["the"], ru: ["определённый артикль"] },
		semanticRelations: {
			targetKind: "reading",
			synonym: [
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "DET",
						canonicalForm: "der",
						coreFeatures: {
							definite: "Def",
							extPos: null,
							foreign: null,
							numType: null,
							person: null,
							polite: null,
							poss: null,
							pronType: "Art",
						},
						unitKind: "Lemma",
					},
					emojiDescription: "👉",
				},
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "DET",
						canonicalForm: "das",
						coreFeatures: {
							definite: "Def",
							extPos: null,
							foreign: null,
							numType: null,
							person: null,
							polite: null,
							poss: null,
							pronType: "Art",
						},
						unitKind: "Lemma",
					},
					emojiDescription: "👉",
				},
			],
		},
	},
	coverage: {
		transcription: "Authored",
		definition: "Authored",
		translations: { en: "Authored", ru: "Authored" },
		semanticRelationTargetKind: "reading",
		semanticRelations: {
			synonym: "Authored",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
