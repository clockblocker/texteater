import type { AuthoredMember } from "../../../../../member.js";
import { referentialEs } from "../../../../pronoun-paradigms.js";

const referential = referentialEs("Acc");

export const member: AuthoredMember = {
	lemma: referential.lemma,
	reading: { ...referential.reading, emojiDescription: "👉" },
	knowledge: {
		definition:
			"Das vorausweisende „es“ (Korrelat) steht als Objekt für einen nachgestellten Nebensatz oder Infinitiv und weist auf ihn voraus: „Ich bedaure es, dass du gehst.“ Es entfällt, wenn der Nebensatz selbst vorn steht („Dass du gehst, bedaure ich“).",
		transcription: "ɛs",
		translations: {
			en: ["it (pointing ahead to a following clause)"],
			ru: [
				"то (указывает на следующее придаточное; часто не переводится)",
			],
		},
	},
	coverage: referential.coverage,
};
