import { z } from "zod";

import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../../../../knowledge-generation/relations";
import {
	analyzeCombinedGermanKnowledgeCase,
	type CombinedGermanKnowledgeCaseAnalysis,
} from "./evaluator";

export type RelationGateThreshold = Readonly<{
	minimumPrecision: number;
	maximumFalsePositiveRate: number;
	maximumHarmfulFalsePositiveRate: number;
	minimumRecall: number;
	minimumNullAccuracy: number;
	minimumTargetFamilyKindAccuracy: number;
	minimumStability: number;
}>;

const exactThreshold: RelationGateThreshold = Object.freeze({
	minimumPrecision: 1,
	maximumFalsePositiveRate: 0,
	maximumHarmfulFalsePositiveRate: 0,
	minimumRecall: 1,
	minimumNullAccuracy: 1,
	minimumTargetFamilyKindAccuracy: 1,
	minimumStability: 1,
});

/** Precision-first publication policy; no relation can hide behind an average. */
export const GERMAN_RELATION_GATE_THRESHOLDS = Object.freeze(
	Object.fromEntries(
		requestableRelationSchema.options.map((relation) => [
			relation,
			exactThreshold,
		]),
	) as Readonly<Record<RequestableRelation, RelationGateThreshold>>,
);

export const MINIMUM_STABILITY_RUNS = 3;

const ratioSchema = z.number().finite().min(0).max(1);
const nonnegativeIntegerSchema = z.number().int().finite().nonnegative();
const thresholdSchema = z.strictObject({
	minimumPrecision: ratioSchema,
	maximumFalsePositiveRate: ratioSchema,
	maximumHarmfulFalsePositiveRate: ratioSchema,
	minimumRecall: ratioSchema,
	minimumNullAccuracy: ratioSchema,
	minimumTargetFamilyKindAccuracy: ratioSchema,
	minimumStability: ratioSchema,
});
const relationMetricsSchema = z.strictObject({
	requestedObservationCount: nonnegativeIntegerSchema,
	predictedTargetCount: nonnegativeIntegerSchema,
	truePositiveCount: nonnegativeIntegerSchema,
	falsePositiveCount: nonnegativeIntegerSchema,
	harmfulFalsePositiveCount: nonnegativeIntegerSchema,
	requiredTargetCount: nonnegativeIntegerSchema,
	matchedRequiredTargetCount: nonnegativeIntegerSchema,
	omissionCount: nonnegativeIntegerSchema,
	wrongFamilyCount: nonnegativeIntegerSchema,
	wrongKindCount: nonnegativeIntegerSchema,
	kindConfusionCount: nonnegativeIntegerSchema,
	unclassifiedFalsePositiveCount: nonnegativeIntegerSchema,
	nullExpectedObservationCount: nonnegativeIntegerSchema,
	correctNullObservationCount: nonnegativeIntegerSchema,
	stableCaseCount: nonnegativeIntegerSchema,
	stabilityCaseCount: nonnegativeIntegerSchema,
	precision: ratioSchema,
	falsePositiveRate: ratioSchema,
	harmfulFalsePositiveRate: ratioSchema,
	recall: ratioSchema,
	nullAccuracy: ratioSchema,
	targetFamilyKindAccuracy: ratioSchema,
	stability: ratioSchema,
});
const relationGateSchema = z.strictObject({
	minimumRunsPass: z.boolean(),
	precisionPass: z.boolean(),
	falsePositiveRatePass: z.boolean(),
	harmfulFalsePositiveRatePass: z.boolean(),
	recallPass: z.boolean(),
	nullAccuracyPass: z.boolean(),
	targetFamilyKindPass: z.boolean(),
	kindConfusionPass: z.boolean(),
	unclassifiedPass: z.boolean(),
	stabilityPass: z.boolean(),
	pass: z.boolean(),
});
const relationReportSchema = z.strictObject({
	relation: requestableRelationSchema,
	threshold: thresholdSchema,
	metrics: relationMetricsSchema,
	gate: relationGateSchema,
});

export const germanRelationEvaluationReportSchema = z.strictObject({
	formatVersion: z.literal("german-relation-evaluation-v1"),
	runCount: nonnegativeIntegerSchema,
	minimumStabilityRuns: z.literal(MINIMUM_STABILITY_RUNS),
	caseObservationCount: nonnegativeIntegerSchema,
	contractPassCount: nonnegativeIntegerSchema,
	exactDiagnosticPassCount: nonnegativeIntegerSchema,
	structuralFailureCount: nonnegativeIntegerSchema,
	unclassifiedMissCount: nonnegativeIntegerSchema,
	requestedRelations: z.array(requestableRelationSchema),
	kindConfusionMatrix: z.partialRecord(
		requestableRelationSchema,
		z.partialRecord(requestableRelationSchema, nonnegativeIntegerSchema),
	),
	byRelation: z.partialRecord(
		requestableRelationSchema,
		relationReportSchema,
	),
	overallGatePass: z.boolean(),
});

export type GermanRelationEvaluationReport = z.infer<
	typeof germanRelationEvaluationReportSchema
>;

export type GermanRelationEvaluationRun = Readonly<{
	runId: string;
	cases: readonly Readonly<{
		caseId: string;
		input: GermanKnowledgeGenerationInput;
		idealOutput: GermanKnowledgeAnalysis;
		output: GermanKnowledgeAnalysis;
	}>[];
}>;

export function createGermanRelationEvaluationReport(args: {
	readonly runs: readonly GermanRelationEvaluationRun[];
}): GermanRelationEvaluationReport {
	assertRuns(args.runs);
	const analyzedRuns = args.runs.map((run) => ({
		runId: run.runId,
		analyses: run.cases.map(analyzeCombinedGermanKnowledgeCase),
	}));
	const analyses = analyzedRuns.flatMap(({ analyses }) => analyses);
	const requestedRelations = requestableRelationSchema.options.filter(
		(relation) =>
			analyses.some(
				(analysis) => analysis.relations[relation] !== undefined,
			),
	);
	const kindConfusionMatrix = confusionMatrix(analyses);
	const byRelation = Object.fromEntries(
		requestedRelations.map((relation) => [
			relation,
			relationReport(relation, analyzedRuns),
		]),
	) as Partial<
		Record<RequestableRelation, z.infer<typeof relationReportSchema>>
	>;
	const structuralFailureCount = analyses.filter(
		(analysis) =>
			!analysis.requestShapePass ||
			!analysis.crossAspectConsistencyPass ||
			!analysis.relationKindsPass,
	).length;
	const unclassifiedMissCount = analyses.reduce(
		(total, analysis) =>
			total +
			Object.values(analysis.relations).reduce(
				(subtotal, leaf) =>
					subtotal + leaf.unclassifiedFalsePositiveCount,
				0,
			),
		0,
	);
	const report = {
		formatVersion: "german-relation-evaluation-v1" as const,
		runCount: args.runs.length,
		minimumStabilityRuns: MINIMUM_STABILITY_RUNS,
		caseObservationCount: analyses.length,
		contractPassCount: analyses.filter(({ contractPass }) => contractPass)
			.length,
		exactDiagnosticPassCount: analyses.filter(
			({ relationExactDiagnosticPass }) => relationExactDiagnosticPass,
		).length,
		structuralFailureCount,
		unclassifiedMissCount,
		requestedRelations,
		kindConfusionMatrix,
		byRelation,
		overallGatePass:
			args.runs.length >= MINIMUM_STABILITY_RUNS &&
			structuralFailureCount === 0 &&
			unclassifiedMissCount === 0 &&
			requestedRelations.every(
				(relation) => byRelation[relation]?.gate.pass === true,
			),
	};
	return deepFreeze(germanRelationEvaluationReportSchema.parse(report));
}

function relationReport(
	relation: RequestableRelation,
	runs: readonly Readonly<{
		runId: string;
		analyses: readonly CombinedGermanKnowledgeCaseAnalysis[];
	}>[],
): z.infer<typeof relationReportSchema> {
	const leaves = runs.flatMap(({ analyses }) =>
		analyses.flatMap((analysis) => {
			const leaf = analysis.relations[relation];
			return leaf === undefined
				? []
				: [{ caseId: analysis.caseId, leaf }];
		}),
	);
	const predictedTargetCount = sum(
		leaves,
		({ leaf }) => leaf.truePositiveCount + leaf.falsePositiveCount,
	);
	const truePositiveCount = sum(leaves, ({ leaf }) => leaf.truePositiveCount);
	const falsePositiveCount = sum(
		leaves,
		({ leaf }) => leaf.falsePositiveCount,
	);
	const harmfulFalsePositiveCount = sum(
		leaves,
		({ leaf }) => leaf.harmfulFalsePositiveCount,
	);
	const requiredTargetCount = sum(
		leaves,
		({ leaf }) => leaf.requiredTargetCount,
	);
	const matchedRequiredTargetCount = sum(
		leaves,
		({ leaf }) => leaf.matchedRequiredTargetCount,
	);
	const wrongFamilyCount = sum(leaves, ({ leaf }) => leaf.wrongFamilyCount);
	const wrongKindCount = sum(leaves, ({ leaf }) => leaf.wrongKindCount);
	const nullLeaves = leaves.filter(({ leaf }) => leaf.expectedNull);
	const stability = stabilityMetrics(relation, runs);
	const metrics = {
		requestedObservationCount: leaves.length,
		predictedTargetCount,
		truePositiveCount,
		falsePositiveCount,
		harmfulFalsePositiveCount,
		requiredTargetCount,
		matchedRequiredTargetCount,
		omissionCount: sum(leaves, ({ leaf }) => leaf.omissionCount),
		wrongFamilyCount,
		wrongKindCount,
		kindConfusionCount: sum(leaves, ({ leaf }) => leaf.confusions.length),
		unclassifiedFalsePositiveCount: sum(
			leaves,
			({ leaf }) => leaf.unclassifiedFalsePositiveCount,
		),
		nullExpectedObservationCount: nullLeaves.length,
		correctNullObservationCount: nullLeaves.filter(
			({ leaf }) => leaf.actualNull,
		).length,
		stableCaseCount: stability.stableCaseCount,
		stabilityCaseCount: stability.stabilityCaseCount,
		precision: ratio(truePositiveCount, predictedTargetCount, 1),
		falsePositiveRate: ratio(falsePositiveCount, predictedTargetCount, 0),
		harmfulFalsePositiveRate: ratio(
			harmfulFalsePositiveCount,
			predictedTargetCount,
			0,
		),
		recall: ratio(matchedRequiredTargetCount, requiredTargetCount, 1),
		nullAccuracy: ratio(
			nullLeaves.filter(({ leaf }) => leaf.actualNull).length,
			nullLeaves.length,
			1,
		),
		targetFamilyKindAccuracy: ratio(
			predictedTargetCount - wrongFamilyCount - wrongKindCount,
			predictedTargetCount,
			1,
		),
		stability: ratio(
			stability.stableCaseCount,
			stability.stabilityCaseCount,
			0,
		),
	};
	const threshold = GERMAN_RELATION_GATE_THRESHOLDS[relation];
	const gate = {
		minimumRunsPass: runs.length >= MINIMUM_STABILITY_RUNS,
		precisionPass: metrics.precision >= threshold.minimumPrecision,
		falsePositiveRatePass:
			metrics.falsePositiveRate <= threshold.maximumFalsePositiveRate,
		harmfulFalsePositiveRatePass:
			metrics.harmfulFalsePositiveRate <=
				threshold.maximumHarmfulFalsePositiveRate &&
			harmfulFalsePositiveCount === 0,
		recallPass: metrics.recall >= threshold.minimumRecall,
		nullAccuracyPass: metrics.nullAccuracy >= threshold.minimumNullAccuracy,
		targetFamilyKindPass:
			metrics.targetFamilyKindAccuracy >=
			threshold.minimumTargetFamilyKindAccuracy,
		kindConfusionPass: metrics.kindConfusionCount === 0,
		unclassifiedPass: metrics.unclassifiedFalsePositiveCount === 0,
		stabilityPass: metrics.stability >= threshold.minimumStability,
		pass: false,
	};
	gate.pass = Object.entries(gate).every(
		([name, value]) => name === "pass" || value,
	);
	return deepFreeze({ relation, threshold, metrics, gate });
}

function stabilityMetrics(
	relation: RequestableRelation,
	runs: readonly Readonly<{
		runId: string;
		analyses: readonly CombinedGermanKnowledgeCaseAnalysis[];
	}>[],
) {
	const caseIds = new Set(
		runs.flatMap(({ analyses }) =>
			analyses.flatMap((analysis) =>
				analysis.relations[relation] === undefined
					? []
					: [analysis.caseId],
			),
		),
	);
	let stableCaseCount = 0;
	for (const caseId of caseIds) {
		const signatures = runs.map(
			({ analyses }) =>
				analyses.find((analysis) => analysis.caseId === caseId)
					?.relations[relation]?.actualSignature ?? "missing",
		);
		if (new Set(signatures).size === 1 && !signatures.includes("missing"))
			stableCaseCount += 1;
	}
	return { stableCaseCount, stabilityCaseCount: caseIds.size };
}

function confusionMatrix(
	analyses: readonly CombinedGermanKnowledgeCaseAnalysis[],
) {
	const matrix: Partial<
		Record<
			RequestableRelation,
			Partial<Record<RequestableRelation, number>>
		>
	> = {};
	for (const analysis of analyses) {
		for (const leaf of Object.values(analysis.relations)) {
			for (const confusion of leaf.confusions) {
				const row = matrix[confusion.actualRelation] ?? {};
				matrix[confusion.actualRelation] = row;
				row[confusion.expectedRelation] =
					(row[confusion.expectedRelation] ?? 0) + 1;
			}
		}
	}
	return matrix;
}

function assertRuns(runs: readonly GermanRelationEvaluationRun[]): void {
	const ids = new Set<string>();
	for (const run of runs) {
		if (run.runId.trim().length === 0)
			throw new Error("Relation evaluation run IDs must be non-empty.");
		if (ids.has(run.runId))
			throw new Error(
				`Relation evaluation repeats run ID "${run.runId}".`,
			);
		ids.add(run.runId);
		const caseIds = run.cases.map(({ caseId }) => caseId);
		if (new Set(caseIds).size !== caseIds.length)
			throw new Error(
				`Relation evaluation run "${run.runId}" repeats a case ID.`,
			);
	}
}

function sum<Value>(
	values: readonly Value[],
	select: (value: Value) => number,
): number {
	return values.reduce((total, value) => total + select(value), 0);
}

function ratio(numerator: number, denominator: number, empty: number): number {
	return denominator === 0 ? empty : numerator / denominator;
}

function deepFreeze<Value>(value: Value): Value {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}
