import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "bist",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🟰" }, lemma },
	knowledge: {
		transcription: "bɪst",
		definition:
			"Das Auxiliar „bist“ bezeichnet dieselbe Identität wie „sein“ in einer eigenständigen grammatischen Form.",
		translations: { en: ["are"], ru: ["форма «быть»: ты"] },
		semanticRelations: {
			targetKind: "reading",
			synonym: [
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "AUX",
						canonicalForm: "sein",
						coreFeatures: { verbType: null },
						unitKind: "Lemma",
					},
					emojiDescription: "🟰",
				},
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "AUX",
						canonicalForm: "bin",
						coreFeatures: { verbType: null },
						unitKind: "Lemma",
					},
					emojiDescription: "🟰",
				},
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "AUX",
						canonicalForm: "ist",
						coreFeatures: { verbType: null },
						unitKind: "Lemma",
					},
					emojiDescription: "🟰",
				},
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "AUX",
						canonicalForm: "sind",
						coreFeatures: { verbType: null },
						unitKind: "Lemma",
					},
					emojiDescription: "🟰",
				},
				{
					unitKind: "Reading",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "AUX",
						canonicalForm: "seid",
						coreFeatures: { verbType: null },
						unitKind: "Lemma",
					},
					emojiDescription: "🟰",
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
