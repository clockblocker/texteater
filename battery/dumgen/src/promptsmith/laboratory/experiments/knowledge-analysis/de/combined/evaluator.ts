import type { LexicalUnitShadow } from "dumrel";

import {
	assertGermanKnowledgeAnalysisMirrorsRequest,
	type GermanKnowledgeAnalysis,
	type GermanKnowledgeGenerationInput,
	type germanKnowledgeAnalysisSchema,
	type germanKnowledgeGenerationInputSchema,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	type RequestableRelation,
	requestableRelationSchema,
} from "../../../../../../knowledge-generation/relations";
import type { ExperimentEvaluation } from "../../../../../assembly";
import { stableJson } from "../../../../../assembly";
import {
	type RelationCorpusAdjudication,
	relationCorpusAdjudications,
} from "../../../../../production/knowledge-analysis/de/combined/golden-corpus/retained-cases";

type Target = LexicalUnitShadow<"de">;

export type RelationKindConfusion = Readonly<{
	target: Target;
	actualRelation: RequestableRelation;
	expectedRelation: RequestableRelation;
}>;

export type RelationLeafEvaluation = Readonly<{
	relation: RequestableRelation;
	requested: boolean;
	expectedNull: boolean;
	actualNull: boolean;
	nullBehaviorPass: boolean;
	exactDiagnosticPass: boolean;
	semanticPass: boolean;
	truePositiveCount: number;
	falsePositiveCount: number;
	harmfulFalsePositiveCount: number;
	requiredTargetCount: number;
	matchedRequiredTargetCount: number;
	omissionCount: number;
	wrongFamilyCount: number;
	wrongKindCount: number;
	unclassifiedFalsePositiveCount: number;
	precision: number;
	falsePositiveRate: number;
	harmfulFalsePositiveRate: number;
	recall: number;
	confusions: readonly RelationKindConfusion[];
	actualSignature: string;
}>;

export type CombinedGermanKnowledgeCaseAnalysis = Readonly<{
	caseId: string;
	requestShapePass: boolean;
	transcriptionPass: boolean;
	definitionPass: boolean;
	translationPass: boolean;
	relationKindsPass: boolean;
	relationExactDiagnosticPass: boolean;
	crossAspectConsistencyPass: boolean;
	relationSemanticPass: boolean;
	precisionPass: boolean;
	requiredTargetsPass: boolean;
	nullBehaviorPass: boolean;
	targetFamilyKindPass: boolean;
	kindConfusionPass: boolean;
	harmfulTargetsPass: boolean;
	unclassifiedTargetsPass: boolean;
	contractPass: boolean;
	relations: Readonly<
		Partial<Record<RequestableRelation, RelationLeafEvaluation>>
	>;
}>;

/** Boolean diagnostics retained by the generic direct evaluation runner. */
export type CombinedGermanKnowledgeEvaluation = Readonly<{
	contractPass: boolean;
	requestShapePass: boolean;
	crossAspectConsistencyPass: boolean;
	relationKindsPass: boolean;
	relationExactDiagnosticPass: boolean;
	relationSemanticPass: boolean;
	precisionPass: boolean;
	requiredTargetsPass: boolean;
	nullBehaviorPass: boolean;
	targetFamilyKindPass: boolean;
	kindConfusionPass: boolean;
	harmfulTargetsPass: boolean;
	unclassifiedTargetsPass: boolean;
}>;

export const evaluateCombinedGermanKnowledge: ExperimentEvaluation<
	typeof germanKnowledgeGenerationInputSchema,
	typeof germanKnowledgeAnalysisSchema,
	CombinedGermanKnowledgeEvaluation
> = (args) => booleanDiagnostics(analyzeCombinedGermanKnowledgeCase(args));

export function analyzeCombinedGermanKnowledgeCase(args: {
	readonly caseId: string;
	readonly input: GermanKnowledgeGenerationInput;
	readonly idealOutput: GermanKnowledgeAnalysis;
	readonly output: GermanKnowledgeAnalysis;
}): CombinedGermanKnowledgeCaseAnalysis {
	const adjudication = relationCorpusAdjudications.byCaseId[args.caseId];
	if (adjudication === undefined) {
		throw new Error(
			`Combined German Knowledge case "${args.caseId}" has no retained adjudication.`,
		);
	}

	let requestShapePass = true;
	try {
		assertGermanKnowledgeAnalysisMirrorsRequest(args.input, args.output);
	} catch {
		requestShapePass = false;
	}

	const transcriptionPass =
		args.output.transcription === args.idealOutput.transcription;
	const definitionPass = nullableCandidatePass(
		args.output.definition,
		args.idealOutput.definition,
	);
	const translationPass =
		args.output.translations?.en === args.idealOutput.translations?.en;
	const relationKindsPass =
		stableJson(Object.keys(args.output.semanticRelations ?? {}).sort()) ===
		stableJson(
			Object.keys(args.idealOutput.semanticRelations ?? {}).sort(),
		);
	const relationExactDiagnosticPass =
		relationTargets(args.output.semanticRelations) ===
		relationTargets(args.idealOutput.semanticRelations);
	const crossAspectConsistencyPass =
		transcriptionPass && definitionPass && translationPass;
	const relations = analyzeRelations({
		actual: args.output.semanticRelations,
		expected: args.idealOutput.semanticRelations,
		adjudication,
	});
	const leaves = Object.values(relations);
	const relationSemanticPass = leaves.every(
		({ semanticPass }) => semanticPass,
	);
	const precisionPass = leaves.every(
		({ falsePositiveCount }) => falsePositiveCount === 0,
	);
	const requiredTargetsPass = leaves.every(
		({ omissionCount }) => omissionCount === 0,
	);
	const nullBehaviorPass = leaves.every((leaf) => leaf.nullBehaviorPass);
	const targetFamilyKindPass = leaves.every(
		({ wrongFamilyCount, wrongKindCount }) =>
			wrongFamilyCount === 0 && wrongKindCount === 0,
	);
	const kindConfusionPass = leaves.every(
		({ confusions }) => confusions.length === 0,
	);
	const harmfulTargetsPass = leaves.every(
		({ harmfulFalsePositiveCount }) => harmfulFalsePositiveCount === 0,
	);
	const unclassifiedTargetsPass = leaves.every(
		({ unclassifiedFalsePositiveCount }) =>
			unclassifiedFalsePositiveCount === 0,
	);
	const contractPass =
		requestShapePass &&
		crossAspectConsistencyPass &&
		relationKindsPass &&
		relationSemanticPass &&
		harmfulTargetsPass &&
		unclassifiedTargetsPass;

	return deepFreeze({
		caseId: args.caseId,
		requestShapePass,
		transcriptionPass,
		definitionPass,
		translationPass,
		relationKindsPass,
		relationExactDiagnosticPass,
		crossAspectConsistencyPass,
		relationSemanticPass,
		precisionPass,
		requiredTargetsPass,
		nullBehaviorPass,
		targetFamilyKindPass,
		kindConfusionPass,
		harmfulTargetsPass,
		unclassifiedTargetsPass,
		contractPass,
		relations,
	});
}

function analyzeRelations(args: {
	readonly actual: GermanKnowledgeAnalysis["semanticRelations"];
	readonly expected: GermanKnowledgeAnalysis["semanticRelations"];
	readonly adjudication: RelationCorpusAdjudication;
}): Readonly<Partial<Record<RequestableRelation, RelationLeafEvaluation>>> {
	const result: Partial<Record<RequestableRelation, RelationLeafEvaluation>> =
		{};
	const requested = new Set([
		...Object.keys(args.expected ?? {}),
		...Object.keys(args.actual ?? {}),
	] as RequestableRelation[]);
	for (const relation of requestableRelationSchema.options) {
		if (!requested.has(relation)) continue;
		result[relation] = analyzeRelationLeaf({ ...args, relation });
	}
	return deepFreeze(result);
}

function analyzeRelationLeaf(args: {
	readonly relation: RequestableRelation;
	readonly actual: GermanKnowledgeAnalysis["semanticRelations"];
	readonly expected: GermanKnowledgeAnalysis["semanticRelations"];
	readonly adjudication: RelationCorpusAdjudication;
}): RelationLeafEvaluation {
	const actualValue = args.actual?.[args.relation];
	const expectedValue = args.expected?.[args.relation];
	const variants = [
		expectedValue,
		...(args.adjudication.acceptableTargetSets?.[args.relation] ?? []),
	];
	const actualTargets = actualValue === null ? [] : (actualValue ?? []);
	const chosen = chooseClosestVariant(actualTargets, variants);
	const requiredTargets =
		chosen === null || chosen === undefined ? [] : chosen;
	const requiredKeys = new Set(requiredTargets.map(targetKey));
	const actualKeys = new Set(actualTargets.map(targetKey));
	const allAcceptedByRelation = acceptedTargetsByRelation(
		args.expected,
		args.adjudication,
	);
	let truePositiveCount = 0;
	let harmfulFalsePositiveCount = 0;
	let wrongFamilyCount = 0;
	let wrongKindCount = 0;
	let unclassifiedFalsePositiveCount = 0;
	const confusions: RelationKindConfusion[] = [];

	for (const target of actualTargets) {
		if (requiredKeys.has(targetKey(target))) {
			truePositiveCount += 1;
			continue;
		}

		let classified = false;
		if (
			args.adjudication.harmfulTargets.some(
				(harmful) =>
					harmful.relation === args.relation &&
					targetKey(harmful.target) === targetKey(target),
			)
		) {
			harmfulFalsePositiveCount += 1;
			classified = true;
		}

		for (const relation of requestableRelationSchema.options) {
			if (relation === args.relation) continue;
			if (
				allAcceptedByRelation[relation]?.some(
					(expectedTarget) =>
						targetKey(expectedTarget) === targetKey(target),
				)
			) {
				confusions.push({
					target,
					actualRelation: args.relation,
					expectedRelation: relation,
				});
				classified = true;
				break;
			}
		}

		const sameCanonical = allAcceptedByRelation[args.relation]?.find(
			(expectedTarget) =>
				expectedTarget.language === target.language &&
				expectedTarget.canonicalForm === target.canonicalForm,
		);
		if (sameCanonical !== undefined) {
			if (sameCanonical.family !== target.family) {
				wrongFamilyCount += 1;
				classified = true;
			} else if (sameCanonical.kind !== target.kind) {
				wrongKindCount += 1;
				classified = true;
			}
		}

		if (!classified) unclassifiedFalsePositiveCount += 1;
	}

	const falsePositiveCount = actualTargets.length - truePositiveCount;
	const matchedRequiredTargetCount = requiredTargets.filter((target) =>
		actualKeys.has(targetKey(target)),
	).length;
	const omissionCount = requiredTargets.length - matchedRequiredTargetCount;
	const expectedNull = variants.some((variant) => variant === null);
	const actualNull = actualValue === null;
	const nullBehaviorPass = expectedNull ? actualNull : !actualNull;
	const semanticPass = variants.some((variant) =>
		relationValueEquals(actualValue, variant),
	);

	return deepFreeze({
		relation: args.relation,
		requested: expectedValue !== undefined,
		expectedNull,
		actualNull,
		nullBehaviorPass,
		exactDiagnosticPass: relationValueEquals(actualValue, expectedValue),
		semanticPass,
		truePositiveCount,
		falsePositiveCount,
		harmfulFalsePositiveCount,
		requiredTargetCount: requiredTargets.length,
		matchedRequiredTargetCount,
		omissionCount,
		wrongFamilyCount,
		wrongKindCount,
		unclassifiedFalsePositiveCount,
		precision: ratio(truePositiveCount, actualTargets.length, 1),
		falsePositiveRate: ratio(falsePositiveCount, actualTargets.length, 0),
		harmfulFalsePositiveRate: ratio(
			harmfulFalsePositiveCount,
			actualTargets.length,
			0,
		),
		recall: ratio(matchedRequiredTargetCount, requiredTargets.length, 1),
		confusions,
		actualSignature: relationValueSignature(actualValue),
	});
}

function acceptedTargetsByRelation(
	expected: GermanKnowledgeAnalysis["semanticRelations"],
	adjudication: RelationCorpusAdjudication,
): Partial<Record<RequestableRelation, readonly Target[]>> {
	const result: Partial<Record<RequestableRelation, readonly Target[]>> = {};
	for (const relation of requestableRelationSchema.options) {
		const values = [
			expected?.[relation],
			...(adjudication.acceptableTargetSets?.[relation] ?? []),
		];
		const targets = new Map<string, Target>();
		for (const value of values) {
			if (value === null || value === undefined) continue;
			for (const target of value) targets.set(targetKey(target), target);
		}
		result[relation] = [...targets.values()];
	}
	return result;
}

function chooseClosestVariant(
	actual: readonly Target[],
	variants: readonly (readonly Target[] | null | undefined)[],
): readonly Target[] | null | undefined {
	return [...variants].sort((left, right) => {
		const distance =
			variantDistance(actual, left) - variantDistance(actual, right);
		return distance === 0
			? relationValueSignature(left).localeCompare(
					relationValueSignature(right),
				)
			: distance;
	})[0];
}

function variantDistance(
	actual: readonly Target[],
	variant: readonly Target[] | null | undefined,
): number {
	const expected = variant === null || variant === undefined ? [] : variant;
	const actualKeys = new Set(actual.map(targetKey));
	const expectedKeys = new Set(expected.map(targetKey));
	return (
		actual.filter((target) => !expectedKeys.has(targetKey(target))).length +
		expected.filter((target) => !actualKeys.has(targetKey(target))).length
	);
}

function relationValueEquals(
	actual: readonly Target[] | null | undefined,
	expected: readonly Target[] | null | undefined,
): boolean {
	return relationValueSignature(actual) === relationValueSignature(expected);
}

function relationValueSignature(
	value: readonly Target[] | null | undefined,
): string {
	if (value === undefined) return "omitted";
	if (value === null) return "null";
	return stableJson(value.map(targetKey).sort());
}

function targetKey(target: Target): string {
	return stableJson(target);
}

function booleanDiagnostics(
	analysis: CombinedGermanKnowledgeCaseAnalysis,
): CombinedGermanKnowledgeEvaluation {
	return Object.freeze({
		contractPass: analysis.contractPass,
		requestShapePass: analysis.requestShapePass,
		crossAspectConsistencyPass: analysis.crossAspectConsistencyPass,
		relationKindsPass: analysis.relationKindsPass,
		relationExactDiagnosticPass: analysis.relationExactDiagnosticPass,
		relationSemanticPass: analysis.relationSemanticPass,
		precisionPass: analysis.precisionPass,
		requiredTargetsPass: analysis.requiredTargetsPass,
		nullBehaviorPass: analysis.nullBehaviorPass,
		targetFamilyKindPass: analysis.targetFamilyKindPass,
		kindConfusionPass: analysis.kindConfusionPass,
		harmfulTargetsPass: analysis.harmfulTargetsPass,
		unclassifiedTargetsPass: analysis.unclassifiedTargetsPass,
	});
}

function nullableCandidatePass(
	actual: string | null | undefined,
	expected: string | null | undefined,
): boolean {
	if (expected === undefined) return actual === undefined;
	if (expected === null) return actual === null;
	return typeof actual === "string" && actual.length > 0;
}

function relationTargets(
	relations: GermanKnowledgeAnalysis["semanticRelations"],
): string {
	return stableJson(
		Object.fromEntries(
			Object.entries(relations ?? {}).map(([relation, targets]) => [
				relation,
				targets === null || targets === undefined
					? null
					: targets.map(stableJson).sort(),
			]),
		),
	);
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
