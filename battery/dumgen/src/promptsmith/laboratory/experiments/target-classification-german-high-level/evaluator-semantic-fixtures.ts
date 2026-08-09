// PROTOTYPE ONLY — executable semantic dependency binding for issue #85.

import { stableJson } from "../../../../lib/stable-json";
import { corpus } from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import {
	semanticTargetFingerprint,
	targetStimulusFingerprint,
} from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/fingerprints";
import {
	evaluateGermanHighLevelClickInvariance,
	evaluateGermanHighLevelTargetClassification,
} from "./evaluator";

export const EVALUATOR_SEMANTIC_FIXTURE_MATRIX_VERSION =
	"german-high-level-target-evaluator-semantics-v1";

const resolvedCaseId = "target-de-boundary-separable-click-steht";
const otherClickCaseId = "target-de-boundary-separable-click-auf";
const unresolvedCaseId = "target-de-robust-unresolved";

export function proveEvaluatorSemanticDependencies() {
	const resolvedCase = requireCase(resolvedCaseId);
	const otherClickCase = requireCase(otherClickCaseId);
	const unresolvedCase = requireCase(unresolvedCaseId);
	const resolvedOutputs = Object.freeze([
		Object.freeze({ name: "exact", output: resolvedCase.idealOutput }),
		Object.freeze({
			name: "wrong-route",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [2, 8],
				},
			},
		}),
		Object.freeze({
			name: "non-resolvable-and-missing-click",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [1],
				},
			},
		}),
		Object.freeze({
			name: "unordered",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [8, 2],
				},
			},
		}),
		Object.freeze({
			name: "duplicate",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2, 2, 8],
				},
			},
		}),
		Object.freeze({
			name: "missing-click",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [8],
				},
			},
		}),
		Object.freeze({
			name: "out-of-bounds",
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2, 999],
				},
			},
		}),
		Object.freeze({
			name: "invalid-schema-shape",
			output: { decision: "Resolved" },
		}),
	]);
	const evaluations = resolvedOutputs.map((fixture) =>
		Object.freeze({
			name: fixture.name,
			output: fixture.output,
			evaluation: evaluateGermanHighLevelTargetClassification({
				caseId: `${resolvedCaseId}/${fixture.name}`,
				input: resolvedCase.input,
				idealOutput: resolvedCase.idealOutput,
				output: fixture.output,
			}),
		}),
	);
	assertEvaluation(evaluations, "exact", {
		contractPass: true,
		canonicalShapePass: true,
		routePass: true,
		validMembershipPass: true,
	});
	assertEvaluation(evaluations, "wrong-route", {
		contractPass: false,
		canonicalShapePass: true,
		routePass: false,
		validMembershipPass: true,
	});
	assertEvaluation(evaluations, "non-resolvable-and-missing-click", {
		contractPass: false,
		nonResolvableMembershipPass: false,
		clickInclusionPass: false,
	});
	assertEvaluation(evaluations, "unordered", {
		contractPass: false,
		orderPass: false,
		uniquenessPass: true,
	});
	assertEvaluation(evaluations, "duplicate", {
		contractPass: false,
		orderPass: false,
		uniquenessPass: false,
	});
	assertEvaluation(evaluations, "missing-click", {
		contractPass: false,
		clickInclusionPass: false,
	});
	assertEvaluation(evaluations, "out-of-bounds", {
		contractPass: false,
		validMembershipPass: false,
	});
	assertEvaluation(evaluations, "invalid-schema-shape", {
		contractPass: false,
		canonicalShapePass: false,
	});
	const unresolvedEvaluation = evaluateGermanHighLevelTargetClassification({
		caseId: unresolvedCaseId,
		input: unresolvedCase.input,
		idealOutput: unresolvedCase.idealOutput,
		output: unresolvedCase.idealOutput,
	});
	if (!unresolvedEvaluation.contractPass) {
		throw new Error("Frozen Unresolved evaluator fixture must pass.");
	}
	const fingerprints = Object.freeze({
		resolved: semanticTargetFingerprint({
			input: resolvedCase.input,
			output: resolvedCase.idealOutput,
		}),
		otherClick: semanticTargetFingerprint({
			input: otherClickCase.input,
			output: otherClickCase.idealOutput,
		}),
		resolvedStimulus: targetStimulusFingerprint(resolvedCase.input),
		otherClickStimulus: targetStimulusFingerprint(otherClickCase.input),
	});
	if (
		fingerprints.resolved !== fingerprints.otherClick ||
		fingerprints.resolvedStimulus !== fingerprints.otherClickStimulus
	) {
		throw new Error("Frozen cross-click semantic fingerprints must match.");
	}
	const expectations = [
		{
			caseId: resolvedCaseId,
			input: resolvedCase.input,
			idealOutput: resolvedCase.idealOutput,
		},
		{
			caseId: otherClickCaseId,
			input: otherClickCase.input,
			idealOutput: otherClickCase.idealOutput,
		},
	];
	const passingClickAggregate = evaluateGermanHighLevelClickInvariance({
		expectations,
		observations: [
			{ caseId: resolvedCaseId, output: resolvedCase.idealOutput },
			{ caseId: otherClickCaseId, output: otherClickCase.idealOutput },
		],
	});
	const failingClickAggregate = evaluateGermanHighLevelClickInvariance({
		expectations,
		observations: [
			{ caseId: resolvedCaseId, output: resolvedCase.idealOutput },
			{ caseId: otherClickCaseId, output: resolvedOutputs[1]?.output },
		],
	});
	if (
		!passingClickAggregate.contractPass ||
		failingClickAggregate.contractPass
	) {
		throw new Error("Frozen click-aggregate semantics changed.");
	}
	return Object.freeze({
		version: EVALUATOR_SEMANTIC_FIXTURE_MATRIX_VERSION,
		resolvedCase: Object.freeze({
			caseId: resolvedCaseId,
			input: resolvedCase.input,
			idealOutput: resolvedCase.idealOutput,
		}),
		unresolvedCase: Object.freeze({
			caseId: unresolvedCaseId,
			input: unresolvedCase.input,
			idealOutput: unresolvedCase.idealOutput,
			evaluation: unresolvedEvaluation,
		}),
		evaluations: Object.freeze(evaluations),
		fingerprints,
		passingClickAggregate,
		failingClickAggregate,
	});
}

function requireCase(caseId: string) {
	const goldenCase = corpus.cases[caseId];
	if (goldenCase === undefined) throw new Error(`Missing fixture ${caseId}.`);
	return goldenCase;
}

function assertEvaluation(
	evaluations: readonly {
		readonly name: string;
		readonly evaluation: Readonly<Record<string, boolean>>;
	}[],
	name: string,
	expected: Readonly<Record<string, boolean>>,
): void {
	const actual = evaluations.find(
		(fixture) => fixture.name === name,
	)?.evaluation;
	if (actual === undefined)
		throw new Error(`Missing evaluator fixture ${name}.`);
	for (const [field, value] of Object.entries(expected)) {
		if (actual[field] !== value) {
			throw new Error(
				`Evaluator fixture ${name}.${field} expected ${String(value)}; received ${stableJson(actual[field])}.`,
			);
		}
	}
}
