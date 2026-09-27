import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "bekommen",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/** One grammatical use of bekommen; the serving verb's form selects it (ADR 0026). */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🎁" }, lemma },
	knowledge: {
		transcription: "bəˈkɔmən",
		definition:
			"„bekommen“, „kriegen“ oder „erhalten“ als Hilfsverb des Rezipientenpassivs: Mit dem Partizip II rückt es den Empfänger einer Handlung ins Subjekt (bekommt das Paket geliefert, kriegt alles erklärt).",
		translations: {
			en: ["get (recipient passive auxiliary)"],
			ru: ["получать (вспомогательный глагол пассива адресата)"],
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
