import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import {
	type canonicalInputSchema,
	canonicalOutputSchema,
	semanticTargetFingerprint,
	validateOriginalIndexMembership,
} from "../../../production/prompt-part/target-classification/de/high-level-whole-unit";

export const GERMAN_HIGH_LEVEL_TARGET_EVALUATOR_VERSION =
	"german-high-level-target-evaluator-v1";

type Input = output<typeof canonicalInputSchema>;
type CanonicalOutput = output<typeof canonicalOutputSchema>;
type Resolved = Extract<CanonicalOutput, { decision: "Resolved" }>;

export type GermanHighLevelTargetEvaluation = {
	readonly contractPass: boolean;
	readonly canonicalShapePass: boolean;
	readonly decisionPass: boolean;
	readonly routePass: boolean;
	readonly exactMembershipPass: boolean;
	readonly falseGroupingPass: boolean;
	readonly falseSplittingPass: boolean;
	readonly validMembershipPass: boolean;
	readonly nonResolvableMembershipPass: boolean;
	readonly orderPass: boolean;
	readonly uniquenessPass: boolean;
	readonly clickInclusionPass: boolean;
	readonly correctUnresolvedPass: boolean;
};

export function evaluateGermanHighLevelTargetClassification(args: {
	readonly caseId: string;
	readonly input: Input;
	readonly idealOutput: CanonicalOutput;
	readonly output: unknown;
}): GermanHighLevelTargetEvaluation {
	const parsed = canonicalOutputSchema.safeParse(args.output);
	const actual = parsed.success ? parsed.data : undefined;
	const expectedResolved = resolved(args.idealOutput);
	const actualResolved = actual === undefined ? undefined : resolved(actual);
	const membership =
		actualResolved === undefined
			? undefined
			: validateOriginalIndexMembership(
					args.input,
					actualResolved.target.memberSegmentIndices,
				);
	const expectedMembers = new Set(
		expectedResolved?.target.memberSegmentIndices ?? [],
	);
	const actualMembers = new Set(
		actualResolved?.target.memberSegmentIndices ?? [],
	);
	const decisionPass = actual?.decision === args.idealOutput.decision;
	const routePass =
		expectedResolved === undefined || actualResolved === undefined
			? expectedResolved === actualResolved
			: expectedResolved.target.family === actualResolved.target.family &&
				expectedResolved.target.kind === actualResolved.target.kind;
	const exactMembershipPass =
		expectedResolved === undefined || actualResolved === undefined
			? expectedResolved === actualResolved
			: stableJson(expectedResolved.target.memberSegmentIndices) ===
				stableJson(actualResolved.target.memberSegmentIndices);
	const falseGroupingPass = [...actualMembers].every((index) =>
		expectedMembers.has(index),
	);
	const falseSplittingPass = [...expectedMembers].every((index) =>
		actualMembers.has(index),
	);
	const correctUnresolvedPass =
		args.idealOutput.decision !== "Unresolved" ||
		actual?.decision === "Unresolved";
	const diagnostics = {
		canonicalShapePass: parsed.success,
		decisionPass,
		routePass,
		exactMembershipPass,
		falseGroupingPass,
		falseSplittingPass,
		validMembershipPass:
			actual?.decision === "Unresolved" || membership?.pass === true,
		nonResolvableMembershipPass:
			actual?.decision === "Unresolved" ||
			membership?.resolvableTextPass === true,
		orderPass:
			actual?.decision === "Unresolved" || membership?.orderPass === true,
		uniquenessPass:
			actual?.decision === "Unresolved" ||
			membership?.uniquenessPass === true,
		clickInclusionPass:
			actual?.decision === "Unresolved" ||
			membership?.clickInclusionPass === true,
		correctUnresolvedPass,
	};
	return Object.freeze({
		contractPass: Object.values(diagnostics).every(Boolean),
		...diagnostics,
	});
}

export type ClickObservation = {
	readonly caseId: string;
	readonly output: unknown;
};

export type ClickExpectation = {
	readonly caseId: string;
	readonly input: Input;
	readonly idealOutput: CanonicalOutput;
};

export type ClickInvarianceEvaluation = {
	readonly contractPass: boolean;
	readonly exercisedUnitCount: number;
	readonly invariantUnitCount: number;
	readonly failingCaseIds: readonly string[];
	readonly missingObservationCaseIds: readonly string[];
	readonly missingExpectedMemberClicks: readonly {
		readonly targetFingerprint: string;
		readonly memberSegmentIndex: number;
	}[];
};

export function evaluateGermanHighLevelClickInvariance(args: {
	readonly expectations: readonly ClickExpectation[];
	readonly observations: readonly ClickObservation[];
}): ClickInvarianceEvaluation {
	const units = new Map<string, ClickExpectation[]>();
	for (const expectation of args.expectations) {
		if (expectation.idealOutput.decision !== "Resolved") {
			continue;
		}
		const key = semanticTargetFingerprint({
			input: expectation.input,
			output: expectation.idealOutput,
		});
		const group = units.get(key) ?? [];
		group.push(expectation);
		units.set(key, group);
	}
	const observedByCaseId = new Map(
		args.observations.map((observation) => [
			observation.caseId,
			observation,
		]),
	);
	const missingObservationCaseIds = args.expectations
		.filter(({ caseId }) => !observedByCaseId.has(caseId))
		.map(({ caseId }) => caseId);
	const missingExpectedMemberClicks: {
		targetFingerprint: string;
		memberSegmentIndex: number;
	}[] = [];
	for (const [targetFingerprint, group] of units) {
		const first = group[0];
		if (first?.idealOutput.decision !== "Resolved") {
			continue;
		}
		for (const memberSegmentIndex of first.idealOutput.target
			.memberSegmentIndices) {
			if (
				!group.some(
					(expectation) =>
						expectation.input.clickedSegmentIndex ===
						memberSegmentIndex,
				)
			) {
				missingExpectedMemberClicks.push({
					targetFingerprint,
					memberSegmentIndex,
				});
			}
		}
	}
	const exercised = [...units.entries()].filter(
		([, group]) =>
			group[0]?.idealOutput.decision === "Resolved" &&
			group[0].idealOutput.target.memberSegmentIndices.length > 1,
	);
	const failingCaseIds: string[] = [];
	let invariantUnitCount = 0;
	for (const [, group] of exercised) {
		const first = group[0];
		if (first?.idealOutput.decision !== "Resolved") {
			continue;
		}
		const observedExpectations = group.flatMap((expectation) => {
			const observation = observedByCaseId.get(expectation.caseId);
			if (observation === undefined) {
				return [];
			}
			return [{ expectation, output: observation.output }];
		});
		const signatures = new Set(
			observedExpectations.map(({ expectation, output }) => {
				const parsed = canonicalOutputSchema.safeParse(output);
				return parsed.success
					? semanticTargetFingerprint({
							input: expectation.input,
							output: parsed.data,
						})
					: "<invalid>";
			}),
		);
		const individuallyCorrect = observedExpectations.every(
			({ expectation, output }) =>
				evaluateGermanHighLevelTargetClassification({
					...expectation,
					output,
				}).contractPass,
		);
		const complete = observedExpectations.length === group.length;
		const expectedClicksComplete =
			first.idealOutput.target.memberSegmentIndices.every(
				(memberSegmentIndex) =>
					group.some(
						(expectation) =>
							expectation.input.clickedSegmentIndex ===
							memberSegmentIndex,
					),
			);
		if (
			complete &&
			expectedClicksComplete &&
			signatures.size === 1 &&
			individuallyCorrect
		) {
			invariantUnitCount += 1;
		} else {
			failingCaseIds.push(...group.map(({ caseId }) => caseId));
		}
	}
	return Object.freeze({
		contractPass:
			exercised.length > 0 &&
			invariantUnitCount === exercised.length &&
			missingObservationCaseIds.length === 0 &&
			missingExpectedMemberClicks.length === 0,
		exercisedUnitCount: exercised.length,
		invariantUnitCount,
		failingCaseIds: Object.freeze(failingCaseIds),
		missingObservationCaseIds: Object.freeze(missingObservationCaseIds),
		missingExpectedMemberClicks: Object.freeze(missingExpectedMemberClicks),
	});
}

function resolved(outputValue: CanonicalOutput): Resolved | undefined {
	return outputValue.decision === "Resolved" ? outputValue : undefined;
}
