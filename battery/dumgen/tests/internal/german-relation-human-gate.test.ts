import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	calculateReservationCommitment,
	createAcceptancePreflight,
} from "../../docs/prototypes/german-relation-human-gate/acceptance";
import {
	loadFrozenReview,
	validateVerdict,
} from "../../docs/prototypes/german-relation-human-gate/review";
import {
	type GermanKnowledgeGenerationRequest,
	isEmptyGermanKnowledgeRequest,
} from "../../src/knowledge-generation/de/schemas";
import { stableJson } from "../../src/promptsmith/assembly";
import { combinedGermanKnowledgeAcceptanceExperiment } from "../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluation-suite";
import type {
	RelationKindConfusion,
	RelationLeafEvaluation,
} from "../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import { untouchedAcceptanceReservation } from "../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";

describe("German Relation Semantics human gate", () => {
	test("keeps the frozen evaluation seam explicitly consumed", () => {
		const emptyRequest = {} satisfies GermanKnowledgeGenerationRequest;
		expect(isEmptyGermanKnowledgeRequest(emptyRequest)).toBe(true);
		expect(
			combinedGermanKnowledgeAcceptanceExperiment.evaluation.ids,
		).toHaveLength(12);
		function preserveFrozenEvaluationTypes(
			_confusion: RelationKindConfusion,
			_leaf: RelationLeafEvaluation,
		): void {}
		void preserveFrozenEvaluationTypes;
	});

	test("verifies and loads the exact frozen candidate", async () => {
		const review = await loadFrozenReview();
		expect(review.manifest.candidate.topology).toBe(
			"combined-atomic-prompt-iterations",
		);
		expect(review.candidateReport.gatePass).toBe(false);
		expect(review.state).toBe("development-gate-failed");
		expect(review.acceptanceResult).toBeNull();
		expect(review.acceptancePreflight).toMatchObject({
			blocked: true,
			callCount: 0,
			maximumSpendUsd: "0.000000000",
		});
		expect(stableJson(review)).not.toContain(
			"relation-acceptance-syn-01-streichholz",
		);
		expect(stableJson(review)).not.toContain("Sie entzündete die Kerze");
	});

	test("keeps a committed 12-case reservation out of development", () => {
		const reservation = untouchedAcceptanceReservation;
		expect(reservation.reservedCaseCount).toBe(12);
		expect(reservation.selection.ids).toHaveLength(12);
		expect(calculateReservationCommitment()).toBe(
			reservation.selectionCommitmentSha256,
		);
		expect(
			reservation.selection.ids.every((id) =>
				id.startsWith("relation-acceptance-"),
			),
		).toBe(true);
		const requested = reservation.selection.cases.map(
			({ input }) =>
				Object.keys(input.request.semanticRelations ?? {})[0],
		);
		expect(
			Object.fromEntries(
				[...new Set(requested)].map((relation) => [
					relation,
					requested.filter((value) => value === relation).length,
				]),
			),
		).toEqual({
			synonym: 2,
			nearSynonym: 2,
			antonym: 2,
			nearAntonym: 2,
			hypernym: 2,
			holonym: 2,
		});
	});

	test("uses frozen preflight metadata without exposing case identities", () => {
		const preflight = createAcceptancePreflight();
		expect(preflight).toEqual({
			formatVersion: "german-relation-acceptance-preflight-v1",
			topology: "current-combined-narrow-groups",
			model: "gpt-5.6-luna",
			reasoningEffort: "none",
			iterations: 3,
			reservedCaseCount: 12,
			callCount: 36,
			maximumSpendNanoUsd: 108_635_100,
			maximumSpendUsd: "0.108635100",
			selectionCommitmentSha256:
				"56fd828f15f74f45a481e34597e6d752c6652056e5679fa794e07a05c6da2d93",
		});
		expect(stableJson(preflight)).not.toContain("Streichholz");
		expect(
			createHash("sha256").update(stableJson(preflight)).digest("hex"),
		).toHaveLength(64);
	});

	test("surfaces every emission, material omission, and execution error", async () => {
		const review = await loadFrozenReview();
		expect(review.observations.length).toBeGreaterThan(0);
		expect(
			review.observations.some(({ status }) =>
				status.startsWith("emitted-"),
			),
		).toBe(true);
		expect(
			review.observations.some(
				({ status }) => status === "material-omission",
			),
		).toBe(true);
		expect(
			review.observations.some(
				({ status }) => status === "execution-error",
			),
		).toBe(true);
	});

	test("keeps every final-revision kind disabled and retains the stop regression", async () => {
		const review = await loadFrozenReview();
		expect(
			Object.values(
				review.candidateReport.semanticReport.byRelation,
			).every((item) => item?.gate.pass === false),
		).toBe(true);
		expect(review.candidateReport.stopRuleTriggeredAfterRepetition).toBe(2);
		expect(review.candidateReport.postStopAttemptCount).toBe(50);
		expect(review.candidateReport.stopEnforcementPass).toBe(false);
		expect(review.productionOutcome.qualifiedKinds).toEqual([]);
	});

	test("rejects a human verdict before untouched acceptance exists", async () => {
		const review = await loadFrozenReview();
		expect(() =>
			validateVerdict(
				review.manifest,
				review.state,
				{
					formatVersion: "german-relation-human-verdict-v1",
					candidateId: review.manifest.candidateId,
					byRelation: {},
				},
				{},
			),
		).toThrow("development must clear every proposed per-kind threshold");
	});
});
