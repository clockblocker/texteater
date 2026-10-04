import type { AuthoredMember } from "../../../../member.js";
import { referentialEs } from "../../../../pronoun-paradigms.js";

const referential = referentialEs("Nom");

export const member: AuthoredMember = {
	lemma: referential.lemma,
	reading: { ...referential.reading, emojiDescription: "👉" },
	knowledge: {
		definition:
			"Das vorausweisende „es“ (Korrelat) steht als Subjekt für einen nachgestellten Nebensatz oder Infinitiv und weist auf ihn voraus: „Es war klar, dass er kam.“ Anders als der Platzhalter bleibt es auch im Mittelfeld („Manchmal kam es vor, dass …“); es entfällt, wenn der Nebensatz selbst vorn steht („Dass er kam, war klar“).",
		transcription: "ɛs",
		translations: {
			en: ["it (pointing ahead to a following clause)"],
			ru: ["(указывает на следующее придаточное; обычно не переводится)"],
		},
	},
	coverage: referential.coverage,
};
