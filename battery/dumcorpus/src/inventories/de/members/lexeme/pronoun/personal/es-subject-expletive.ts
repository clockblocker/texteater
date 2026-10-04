import type { AuthoredMember } from "../../../../member.js";
import { referentialEs } from "../../../../pronoun-paradigms.js";

const referential = referentialEs("Nom");

export const member: AuthoredMember = {
	lemma: referential.lemma,
	reading: { ...referential.reading, emojiDescription: "⚪" },
	knowledge: {
		definition:
			"Das nichtreferentielle „es“ bezeichnet keinen Gegenstand und keine Person. Als Subjekt unpersönlicher Verben und Verwendungen bleibt es in jeder Wortstellung, etwa „es regnet“ („Heute regnet es“) oder „es gibt“. Als Platzhalter besetzt es nur die erste Stelle vor einem nachgestellten Subjekt und entfällt, sobald etwas anderes vorn steht: „Es brennt die Hand“, aber „Die Hand brennt“.",
		transcription: "ɛs",
		translations: {
			en: [
				"it (impersonal subject)",
				"there (in existential there is)",
				"(placeholder before a postponed subject; usually untranslated)",
			],
			ru: [
				"формальное подлежащее без предметного значения",
				"(заполнитель первой позиции перед подлежащим; обычно не переводится)",
			],
		},
	},
	coverage: referential.coverage,
};
