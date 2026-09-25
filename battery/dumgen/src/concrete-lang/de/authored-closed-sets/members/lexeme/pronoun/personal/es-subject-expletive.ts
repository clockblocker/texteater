import { defineAuthoredMember } from "../../../../member.js";
import { member as referential } from "./es-third-person-neuter-singular-nominative.js";

export const member = defineAuthoredMember({
	lemma: referential.lemma,
	reading: { ...referential.reading, emojiDescription: "⚪" },
	knowledge: {
		definition:
			"Das nichtreferentielle Subjekt „es“ besetzt die Subjektstelle bei unpersönlichen Verben und Verwendungen, etwa „es regnet“ oder „es gibt“. Es bezeichnet keinen Gegenstand und keine Person.",
		transcription: "ɛs",
		translations: {
			en: ["it (impersonal subject)", "there (in existential there is)"],
			ru: ["формальное подлежащее без предметного значения"],
		},
	},
	coverage: referential.coverage,
});
