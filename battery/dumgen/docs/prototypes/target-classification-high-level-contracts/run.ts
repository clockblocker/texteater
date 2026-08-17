// PROTOTYPE ONLY — bounded direct-serial run of the default frozen suite.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	defineExperiment,
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	definePromptSource,
	stableJson,
} from "../../../src/promptsmith/assembly";
import { createDirectCachedEvaluationRunner } from "../../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";
import { defaultEvaluationSelection } from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/selections";
import { promptSource as productionPromptSource } from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/prompt-source";
import { additionalIndicesAdapter } from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/representation";

const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = { kind: "development", round: 1 } as const;

if (defaultEvaluationSelection.ids.length !== 98) {
	throw new Error(
		`Default target-classification suite must contain 98 cases, found ${defaultEvaluationSelection.ids.length}.`,
	);
}

const materializedCases = Object.fromEntries(
	defaultEvaluationSelection.ids.map((caseId, index) => {
		const goldenCase = defaultEvaluationSelection.cases[index];
		if (goldenCase === undefined) {
			throw new Error(`Default evaluation case ${caseId} is missing.`);
		}
		return [
			caseId,
			{
				...additionalIndicesAdapter.materialize(goldenCase),
				...(goldenCase.explanation === undefined
					? {}
					: { explanation: goldenCase.explanation }),
				...(goldenCase.contaminationKeys === undefined
					? {}
					: { contaminationKeys: goldenCase.contaminationKeys }),
			},
		];
	}),
);

const evaluationCases = defineGoldenCaseCollection(import.meta.url, {
	cases: materializedCases,
});

const evaluationCorpus = defineGoldenCorpus({
	route: productionPromptSource.route,
	inputSchema: productionPromptSource.inputSchema,
	outputSchema: productionPromptSource.outputSchema,
	collections: { defaultEvaluation: evaluationCases },
});

const evaluationPromptSource = definePromptSource({
	...productionPromptSource,
	goldenCorpus: evaluationCorpus,
});

const experiment = defineExperiment({
	promptSource: evaluationPromptSource,
	evaluation: evaluationCorpus.collections.defaultEvaluation,
	evaluator: ({ idealOutput, output }) => {
		const decisionPass = output.decision === idealOutput.decision;
		const routePass =
			stableJson(output.target) === stableJson(idealOutput.target);
		const membershipPass =
			stableJson(output.additionalMemberIndices) ===
			stableJson(idealOutput.additionalMemberIndices);
		return Object.freeze({
			contractPass: stableJson(output) === stableJson(idealOutput),
			decisionPass,
			routePass,
			membershipPass,
		});
	},
});

export const defaultTargetClassificationRunner =
	createDirectCachedEvaluationRunner({
		runnerVersion: "target-classification-high-level-default-v1",
		route: productionPromptSource.route,
		structuredOutputName: "target_classification_high_level_default",
		experiments: {
			development: experiment,
			acceptance: {
				unavailableReason:
					"The promoted default regression suite is a development instrument, not a newly reserved acceptance suite.",
			},
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			decisionPass: z.boolean(),
			routePass: z.boolean(),
			membershipPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 128,
			minimumEvaluationCases: 98,
			maximumEvaluationCases: 98,
			minimumScoreRatio: 1,
		},
		evidence: {
			runsDirectory: join(HERE, "runs"),
			acceptanceReservationPath: join(
				HERE,
				"runs",
				"acceptance-reservation.json",
			),
		},
	});

async function runCli(args: readonly string[]): Promise<void> {
	const [command, ...rest] = args;
	if (rest.length > 0 || (command !== "preflight" && command !== "run")) {
		throw new Error("Usage: run.ts <preflight|run>");
	}
	if (command === "preflight") {
		const checked =
			await defaultTargetClassificationRunner.preflight(PHASE);
		console.log(
			`Preflight passed (${checked.boundedCalls} direct-serial calls; zero provider calls).`,
		);
		return;
	}
	const result =
		await defaultTargetClassificationRunner.runLiveEvaluation(PHASE);
	const failedCaseIds = result.attempts
		.filter((attempt) => !attempt.contractPass)
		.map((attempt) => attempt.caseId);
	if (failedCaseIds.length > 0) {
		console.log(`Failed cases: ${failedCaseIds.join(", ")}`);
	}
}

if (import.meta.main) {
	await runCli(process.argv.slice(2));
}
