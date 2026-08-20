import { describe, expect, test } from "bun:test";
import { projectSemanticRelations, type ReadingEntry } from "../../src";
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
	test("replaces an existing Near Synonym direct claim when Synonym is accepted", () => {
		const plan = planRelationMaintenance({
			lemmas: [{ lemma: englishWalkLemma }, { lemma: englishRunLemma }],
			readings: [
				entry(englishWalkReading, { nearSynonym: [englishRunLemma] }),
				entry(englishRunReading, {}),
			],
			requests: [
				{
					sourceReading: englishWalkReading,
					relation: "synonym",
					target: { kind: "lemma", lemma: englishRunLemma },
				},
			],
		});
		expect(plan).toMatchObject({ status: "planned" });
		if (plan.status !== "planned") return;
		expect(plan.additions).toEqual([
			{
				reading: englishWalkReading,
				relation: "synonym",
				targetLemma: englishRunLemma,
			},
		]);
		expect(plan.removals).toEqual([
			{
				reading: englishWalkReading,
				relation: "nearSynonym",
				targetLemma: englishRunLemma,
			},
		]);
	});

	test("rejects every other direct cross-kind target collision atomically", () => {
		const base = {
			lemmas: [{ lemma: englishWalkLemma }, { lemma: englishRunLemma }],
			readings: [
				entry(englishWalkReading, { synonym: [englishRunLemma] }),
				entry(englishRunReading, {}),
			],
		};
		for (const requests of [
			[
				{
					sourceReading: englishWalkReading,
					relation: "nearSynonym" as const,
					target: { kind: "lemma" as const, lemma: englishRunLemma },
				},
			],
			[
				{
					sourceReading: englishWalkReading,
					relation: "antonym" as const,
					target: { kind: "lemma" as const, lemma: englishRunLemma },
				},
			],
		]) {
			expect(
				planRelationMaintenance({ ...base, requests }),
			).toMatchObject({ status: "rejected", code: "relationConflict" });
		}
	});

	test("keeps exact-Synonym substitution out of the write plan and in the read projection", () => {
		const inventory = {
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
		};
		const plan = planRelationMaintenance({ ...inventory, requests: [] });
		expect(plan.status).toBe("planned");
		if (plan.status !== "planned") return;
		expect(plan.additions).toEqual([]);
		expect(
			projectSemanticRelations(inventory).some(
				(projection) =>
					projection.sourceReading === englishWalkReading &&
					projection.relation === "antonym" &&
					projection.provenance === "inferred" &&
					sameLemma(projection.targetLemma, jogLemma),
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
