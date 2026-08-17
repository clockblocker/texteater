import { expect, test } from "bun:test";
import { readingFingerprint } from "dumling";

import { projectFeatures, projectKnowledge } from "../convex/presentation";

test("projects learner Knowledge and direct relations without storing a view", () => {
	const targetLemma = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Institut",
		coreFeatures: { gender: "Neut", hyph: null },
	} as const;

	expect(
		projectKnowledge(
			{
				definition: "Ein Geldinstitut.",
				translations: { en: ["bank"] },
				semanticRelations: {
					hypernym: [{ lemma: targetLemma, emojiDescription: "🏛️" }],
				},
			},
			{ transcriptions: { de: ["baŋk"] } },
		),
	).toEqual({
		definition: "Ein Geldinstitut.",
		translations: [{ language: "en", values: ["bank"] }],
		transcriptions: [{ language: "de", values: ["baŋk"] }],
		morphologicalTree: null,
		lexicalBreakdown: [],
		relations: [
			{
				relation: "hypernym",
				targetReadingKey: readingFingerprint({
					lemma: targetLemma,
					emojiDescription: "🏛️",
				}),
				targetCanonicalForm: "Institut",
				targetEmojiDescription: "🏛️",
			},
		],
	});
});

test("projects Dumling feature values for learner inspection", () => {
	expect(projectFeatures({ gender: "Fem", hyph: null })).toEqual([
		{ name: "gender", value: "Fem" },
		{ name: "hyph", value: "—" },
	]);
});
