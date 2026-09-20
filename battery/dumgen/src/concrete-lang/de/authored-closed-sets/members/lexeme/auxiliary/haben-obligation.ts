import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "haben",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/** One grammatical use of haben; the serving verb's form selects it (ADR 0026). */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "📌" }, lemma },
	knowledge: {
		transcription: "ˈhaːbn̩",
		definition:
			"„haben“ als Hilfsverb der Verpflichtung: Mit „zu“ und dem Infinitiv drückt es aus, dass jemand etwas tun muss (habe noch zu arbeiten).",
		translations: {
			en: ["have to (obligation auxiliary)"],
			ru: ["быть должным (вспомогательный глагол долженствования)"],
		},
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
