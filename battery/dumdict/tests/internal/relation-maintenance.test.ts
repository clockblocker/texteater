import { describe, expect, test } from "bun:test";
import type { ReadingEntry } from "../../src";
import { sameLemma } from "../../src/core/identity";
import { planRelationMaintenance } from "../../src/core/plan-relation-maintenance";
import {
	englishRunLemma,
	englishRunReading,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	englishWalkReading,
} from "../fixtures/en-notes";

const jogLemma = {
	...englishRunLemma,
	canonicalForm: "jog",
};
const jogReading = { lemma: jogLemma, emojiDescription: "🏃‍➡️" };

function entry(
	reading: ReadingEntry<"en">["reading"],
	semanticRelations: NonNullable<
		ReadingEntry<"en">["knowledge"]
	>["semanticRelations"],
): ReadingEntry<"en"> {
	return {
		reading,
		knowledge: { semanticRelations },
		attestedTranslations: [],
		attestations: [],
		notes: "",
	};
}

describe("relation maintenance planner", () => {
	test("preserves exact-Synonym substitution through both endpoints", () => {
		const plan = planRelationMaintenance({
			lemmas: [
				{ lemma: englishWalkLemma },
				{ lemma: englishRunLemma },
				{ lemma: englishSwimLemma },
				{ lemma: jogLemma },
			],
			readings: [
				entry(englishWalkReading, { synonym: [englishRunLemma] }),
				entry(englishRunReading, {
					synonym: [englishWalkLemma],
					antonym: [englishSwimLemma],
				}),
				entry(englishSwimReading, { synonym: [jogLemma] }),
				entry(jogReading, { synonym: [englishSwimLemma] }),
			],
			requests: [],
		});
		expect(plan.status).toBe("planned");
		if (plan.status !== "planned") return;
		expect(
			plan.additions.some(
				(addition) =>
					addition.reading === englishWalkReading &&
					addition.relation === "antonym" &&
					sameLemma(addition.targetLemma, jogLemma),
			),
		).toBe(true);
	});

	test("does not make hierarchy relations transitive", () => {
		const plan = planRelationMaintenance({
			lemmas: [
				{ lemma: englishWalkLemma },
				{ lemma: englishRunLemma },
				{ lemma: englishSwimLemma },
			],
			readings: [
				entry(englishWalkReading, { hypernym: [englishRunLemma] }),
				entry(englishRunReading, { hypernym: [englishSwimLemma] }),
				entry(englishSwimReading, {}),
			],
			requests: [],
		});
		expect(plan.status).toBe("planned");
		if (plan.status !== "planned") return;
		expect(
			plan.additions.some(
				(addition) =>
					addition.reading === englishWalkReading &&
					addition.relation === "hypernym" &&
					sameLemma(addition.targetLemma, englishSwimLemma),
			),
		).toBe(false);
	});
});
