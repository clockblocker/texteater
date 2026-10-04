import { defineAuthoredMember } from "../../../../member.js";
import { member as referential } from "./es-third-person-neuter-singular-accusative.js";

export const member = defineAuthoredMember({
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
});
