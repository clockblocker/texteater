// PROTOTYPE ONLY — one bounded, direct-serial Partizip-II classification run.

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
import {
	participleBenchmarkPairs,
	participleBenchmarkSelection,
} from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";
import { promptSource as productionPromptSource } from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/prompt-source";
import { additionalIndicesAdapter } from "../../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/representation";

const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = { kind: "development", round: 1 } as const;
const canonicalSelection = participleBenchmarkSelection;
const pairedCaseIds = participleBenchmarkPairs.flatMap((pair) => [
	pair.auxiliaryCaseId,
	pair.participleCaseId,
]);

if (
	participleBenchmarkPairs.length !== 20 ||
	stableJson(pairedCaseIds) !== stableJson(canonicalSelection.ids)
) {
	throw new Error(
		"Partizip-II benchmark must bind exactly 20 ordered pairs to its 40-case selection.",
	);
}

const materializedCases = Object.fromEntries(
	canonicalSelection.ids.map((caseId, index) => {
		const goldenCase = canonicalSelection.cases[index];
		if (goldenCase === undefined) {
			throw new Error(`Partizip-II benchmark case ${caseId} is missing.`);
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

const benchmarkCases = defineGoldenCaseCollection(import.meta.url, {
	cases: materializedCases,
});

const benchmarkCorpus = defineGoldenCorpus({
	route: productionPromptSource.route,
	inputSchema: productionPromptSource.inputSchema,
	outputSchema: productionPromptSource.outputSchema,
	collections: { benchmark: benchmarkCases },
});

const benchmarkPromptSource = definePromptSource({
	...productionPromptSource,
	goldenCorpus: benchmarkCorpus,
});

const benchmarkExperiment = defineExperiment({
	promptSource: benchmarkPromptSource,
	evaluation: benchmarkCorpus.collections.benchmark,
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

export const partizipTwoBenchmarkRunner = createDirectCachedEvaluationRunner({
	runnerVersion: "target-classification-partizip-ii-v1",
	route: productionPromptSource.route,
	structuredOutputName: "target_classification_partizip_ii",
	experiments: {
		development: benchmarkExperiment,
		acceptance: {
			unavailableReason:
				"This is a targeted prompt-compliance benchmark, not an untouched acceptance suite.",
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
		minimumEvaluationCases: 40,
		maximumEvaluationCases: 40,
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

type BenchmarkRun = Awaited<
	ReturnType<typeof partizipTwoBenchmarkRunner.runLiveEvaluation>
>;

export function summarizePartizipTwoPairs(run: BenchmarkRun) {
	const attempts = new Map(
		run.attempts.map((attempt) => [attempt.caseId, attempt]),
	);
	return Object.freeze(
		participleBenchmarkPairs.map((pair) => {
			const auxiliary = attempts.get(pair.auxiliaryCaseId);
			const participle = attempts.get(pair.participleCaseId);
			if (auxiliary === undefined || participle === undefined) {
				throw new Error(`Benchmark pair ${pair.id} is incomplete.`);
			}
			return Object.freeze({
				pairId: pair.id,
				section:
					pair.expected === "VERB"
						? ("Verbal Partizip II" as const)
						: ("Participial adjective" as const),
				auxiliaryPass: auxiliary.contractPass,
				participlePass: participle.contractPass,
				contractPass: auxiliary.contractPass && participle.contractPass,
			});
		}),
	);
}

function printPairSummary(run: BenchmarkRun): void {
	const pairs = summarizePartizipTwoPairs(run);
	const sectionScore = (section: (typeof pairs)[number]["section"]) => {
		const selected = pairs.filter((pair) => pair.section === section);
		return `${selected.filter((pair) => pair.contractPass).length}/${selected.length}`;
	};
	console.log(
		`Pair score: ${pairs.filter((pair) => pair.contractPass).length}/${pairs.length}`,
	);
	console.log(
		`Verbal Partizip II: ${sectionScore("Verbal Partizip II")} pairs`,
	);
	console.log(
		`Participial adjective: ${sectionScore("Participial adjective")} pairs`,
	);
	const failedPairIds = pairs
		.filter((pair) => !pair.contractPass)
		.map((pair) => pair.pairId);
	if (failedPairIds.length > 0) {
		console.log(`Failed pairs: ${failedPairIds.join(", ")}`);
	}
}

async function runCli(args: readonly string[]): Promise<void> {
	const [command, ...rest] = args;
	if (rest.length > 0 || (command !== "preflight" && command !== "run")) {
		throw new Error("Usage: run.ts <preflight|run>");
	}
	if (command === "preflight") {
		const checked = await partizipTwoBenchmarkRunner.preflight(PHASE);
		console.log(
			`Preflight passed (${checked.boundedCalls} direct-serial calls; zero provider calls).`,
		);
		return;
	}
	const result = await partizipTwoBenchmarkRunner.runLiveEvaluation(PHASE);
	printPairSummary(result);
}

if (import.meta.main) {
	await runCli(process.argv.slice(2));
}
