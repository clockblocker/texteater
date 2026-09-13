import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import {
	defineExperiment,
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	definePromptSource,
} from "../../src/promptsmith/assembly";
import { createDirectCachedEvaluationRunner } from "../../src/promptsmith/laboratory/experiments/direct-cached-evaluation-runner";

const acceptancePhase = { kind: "acceptance", claim: "untouched" } as const;
const route = "test/direct-cached-runner";
const inputSchema = z.strictObject({ text: z.string() });
const outputSchema = z.strictObject({ answer: z.string() });
const cases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		developmentOne: {
			input: { text: "development one" },
			idealOutput: { answer: "development one" },
		},
		developmentTwo: {
			input: { text: "development two" },
			idealOutput: { answer: "development two" },
		},
		acceptanceOne: {
			input: { text: "acceptance one" },
			idealOutput: { answer: "acceptance one" },
		},
		acceptanceTwo: {
			input: { text: "acceptance two" },
			idealOutput: { answer: "acceptance two" },
		},
		replacementAcceptanceOne: {
			input: { text: "replacement acceptance one" },
			idealOutput: { answer: "replacement acceptance one" },
		},
		replacementAcceptanceTwo: {
			input: { text: "replacement acceptance two" },
			idealOutput: { answer: "replacement acceptance two" },
		},
	},
});
const corpus = defineGoldenCorpus({
	route,
	inputSchema,
	outputSchema,
	collections: { cases },
});
const promptSource = definePromptSource({
	route,
	inputSchema,
	outputSchema,
	body: "Return the supplied text as answer.",
	goldenCorpus: corpus,
});
const evaluator = (args: {
	readonly idealOutput: z.output<typeof outputSchema>;
	readonly output: z.output<typeof outputSchema>;
}) => {
	const exactPass = args.output.answer === args.idealOutput.answer;
	return { contractPass: exactPass, exactPass };
};
const developmentExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.select(["developmentOne", "developmentTwo"]),
	evaluator,
});
const acceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.select(["acceptanceOne", "acceptanceTwo"]),
	evaluator,
});
const replacementPromptSource = definePromptSource({
	route,
	inputSchema,
	outputSchema,
	body: "Return the supplied text exactly as answer.",
	goldenCorpus: corpus,
});
const replacementDevelopmentExperiment = defineExperiment({
	promptSource: replacementPromptSource,
	evaluation: corpus.select(["developmentOne", "developmentTwo"]),
	evaluator,
});
const replacementAcceptanceExperiment = defineExperiment({
	promptSource: replacementPromptSource,
	evaluation: corpus.select([
		"replacementAcceptanceOne",
		"replacementAcceptanceTwo",
	]),
	evaluator,
});

function createTestRunner(directory: string, replacement = false) {
	return createDirectCachedEvaluationRunner({
		runnerVersion: "shared-runner-test-v1",
		route,
		structuredOutputName: "shared_runner_test",
		experiments: {
			development: replacement
				? replacementDevelopmentExperiment
				: developmentExperiment,
			acceptance: replacement
				? replacementAcceptanceExperiment
				: acceptanceExperiment,
		},
		diagnosticShape: {
			contractPass: z.boolean(),
			exactPass: z.boolean(),
		},
		limits: {
			maxOutputTokens: 100,
			minimumEvaluationCases: 2,
			maximumEvaluationCases: 2,
			minimumScoreRatio: 0.8,
		},
		evidence: {
			runsDirectory: join(directory, "runs"),
			acceptanceReservationPath: join(
				directory,
				"runs",
				"acceptance-reservation.json",
			),
		},
	});
}

test("shared preflight never creates a provider client", async () => {
	const directory = await mkdtemp(join(tmpdir(), "direct-runner-preflight-"));
	try {
		const runner = createTestRunner(directory);
		let clientFactoryCalls = 0;
		const checked = await runner.preflight(
			{ kind: "development", round: 1 },
			{
				createClient() {
					clientFactoryCalls += 1;
					throw new Error("Preflight touched provider transport.");
				},
			},
		);
		expect(clientFactoryCalls).toBe(0);
		expect(checked.boundedCalls).toBe(2);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("acceptance requires three classified rounds and stays consumed after startup failure", async () => {
	const directory = await mkdtemp(
		join(tmpdir(), "direct-runner-acceptance-"),
	);
	try {
		const runner = createTestRunner(directory);
		expect(runner.preflight(acceptancePhase)).rejects.toThrow(
			/missing 1, 2, 3/,
		);

		for (const round of [1, 2, 3] as const) {
			const roundDirectory = join(directory, "runs", `round-${round}`);
			await mkdir(roundDirectory, { recursive: true });
			await writeFile(
				join(roundDirectory, "results.json"),
				JSON.stringify({
					route,
					phase: { kind: "development", round },
					finalizedAt: `2026-08-1${round}T12:00:00.000Z`,
					executionErrorCount: 0,
					unclassifiedMissCount: 0,
				}),
				"utf8",
			);
		}

		await expect(runner.preflight(acceptancePhase)).resolves.toMatchObject({
			boundedCalls: 2,
		});
		await expect(
			runner.runLiveEvaluation(acceptancePhase, {
				createClient() {
					throw new Error(
						"simulated startup failure after reservation",
					);
				},
				now: () => new Date("2026-08-13T12:00:00.000Z"),
			}),
		).rejects.toThrow(/simulated startup failure/);

		const reservation = JSON.parse(
			await readFile(
				join(directory, "runs", "acceptance-reservation.json"),
				"utf8",
			),
		);
		expect(reservation).toMatchObject({
			route,
			claim: "untouched",
		});
		expect(runner.preflight(acceptancePhase)).rejects.toThrow(
			/already been reserved or run/,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("prompt-defect acceptance requires a fresh suite and three new bound rounds even above score threshold", async () => {
	const directory = await mkdtemp(
		join(tmpdir(), "direct-runner-acceptance-replacement-"),
	);
	try {
		const original = createTestRunner(directory);
		const originalBinding = original.evidenceBinding(acceptancePhase);
		const failedDirectory = join(directory, "runs", "failed-acceptance");
		await mkdir(failedDirectory, { recursive: true });
		await writeFile(
			join(failedDirectory, "results.json"),
			JSON.stringify({
				...originalBinding,
				finalizedAt: "2026-08-13T12:00:00.000Z",
				executionErrorCount: 0,
				unclassifiedMissCount: 0,
				evidenceThresholdMet: true,
				attempts: [
					{
						caseId: "acceptanceOne",
						input: { text: "acceptance one" },
						idealOutput: { answer: "acceptance one" },
						contractPass: false,
						missClassification: "prompt-defect",
					},
					{
						caseId: "acceptanceTwo",
						input: { text: "acceptance two" },
						idealOutput: { answer: "acceptance two" },
						contractPass: true,
						missClassification: null,
					},
				],
			}),
			"utf8",
		);

		const replacement = createTestRunner(directory, true);
		await expect(replacement.preflight(acceptancePhase)).rejects.toThrow(
			/after the failed acceptance.*missing 1, 2, 3/,
		);
		for (const round of [1, 2, 3] as const) {
			const binding = replacement.evidenceBinding({
				kind: "development",
				round,
			});
			const roundDirectory = join(
				directory,
				"runs",
				`replacement-round-${round}`,
			);
			await mkdir(roundDirectory, { recursive: true });
			await writeFile(
				join(roundDirectory, "results.json"),
				JSON.stringify({
					...binding,
					finalizedAt: `2026-08-13T13:0${round}:00.000Z`,
					executionErrorCount: 0,
					unclassifiedMissCount: 0,
				}),
				"utf8",
			);
		}

		await expect(
			replacement.preflight(acceptancePhase),
		).resolves.toMatchObject({
			boundedCalls: 2,
		});
		await expect(
			replacement.runLiveEvaluation(acceptancePhase, {
				createClient() {
					throw new Error("replacement startup failure");
				},
				now: () => new Date("2026-08-13T14:00:00.000Z"),
			}),
		).rejects.toThrow(/replacement startup failure/);
		const replacementSuite = replacement.evidenceBinding(acceptancePhase);
		const reservation = JSON.parse(
			await readFile(
				join(
					directory,
					"runs",
					`acceptance-reservation-${replacementSuite.suiteSha256.slice(0, 16)}.json`,
				),
				"utf8",
			),
		);
		expect(reservation).toMatchObject({
			route,
			replacesAcceptance: true,
			suiteSha256: replacementSuite.suiteSha256,
		});
		await expect(replacement.preflight(acceptancePhase)).rejects.toThrow(
			/current untouched acceptance suite has already been reserved/,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("classified corpus defects also permit a fresh acceptance instrument", async () => {
	const directory = await mkdtemp(
		join(tmpdir(), "direct-runner-corpus-replacement-"),
	);
	try {
		const original = createTestRunner(directory);
		const originalBinding = original.evidenceBinding(acceptancePhase);
		const failedDirectory = join(directory, "runs", "invalid-acceptance");
		await mkdir(failedDirectory, { recursive: true });
		await writeFile(
			join(failedDirectory, "results.json"),
			JSON.stringify({
				...originalBinding,
				finalizedAt: "2026-08-13T12:00:00.000Z",
				executionErrorCount: 0,
				unclassifiedMissCount: 0,
				evidenceThresholdMet: false,
				attempts: [
					{
						caseId: "acceptanceOne",
						input: { text: "acceptance one" },
						idealOutput: { answer: "acceptance one" },
						contractPass: false,
						missClassification: "corpus-or-evaluator-defect",
					},
				],
			}),
			"utf8",
		);

		const replacement = createTestRunner(directory, true);
		await expect(replacement.preflight(acceptancePhase)).rejects.toThrow(
			/after the failed acceptance.*missing 1, 2, 3/,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("below-threshold limitations require prompt improvement before a fresh suite", async () => {
	const directory = await mkdtemp(
		join(tmpdir(), "direct-runner-limitation-replacement-"),
	);
	try {
		const original = createTestRunner(directory);
		const originalBinding = original.evidenceBinding(acceptancePhase);
		const failedDirectory = join(directory, "runs", "limited-acceptance");
		await mkdir(failedDirectory, { recursive: true });
		await writeFile(
			join(failedDirectory, "results.json"),
			JSON.stringify({
				...originalBinding,
				finalizedAt: "2026-08-13T12:00:00.000Z",
				executionErrorCount: 0,
				unclassifiedMissCount: 0,
				evidenceThresholdMet: false,
				attempts: [
					{
						caseId: "acceptanceOne",
						input: { text: "acceptance one" },
						idealOutput: { answer: "acceptance one" },
						contractPass: false,
						missClassification: "accepted-model-limitation",
					},
				],
			}),
			"utf8",
		);

		await expect(original.preflight(acceptancePhase)).rejects.toThrow(
			/below-threshold limitation replacement requires an evidence-driven prompt change/,
		);
		const replacement = createTestRunner(directory, true);
		await expect(replacement.preflight(acceptancePhase)).rejects.toThrow(
			/after the failed acceptance.*missing 1, 2, 3/,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
