import { describe, expect, test } from "bun:test";

import { z } from "zod";
import type {
	PromptExecutionRequest,
	PromptExecutor,
} from "../../src/internal/prompt-infra";
import {
	buildPrompt,
	createPromptExperiment,
	evaluatePromptBuild,
	PromptExperimentConfigurationError,
	PromptInfraValidationError,
} from "../../src/internal/prompt-infra";
import { deClassifyPromptSource } from "../../src/internal/prompt-infra/fixtures/de/classify";

describe("createPromptExperiment", () => {
	test("owns the validated build and evaluation corpus behind one interface", async () => {
		const examples = [
			{
				id: "uppercase-1",
				input: "alpha",
				idealOutput: "ALPHA",
			},
			{
				id: "uppercase-2",
				input: "beta",
				idealOutput: "BETA",
			},
		];
		const source = {
			taskDescription: "Return an uppercase copy.",
			examples,
			numOfFirstExamplesToUse: 1,
		};
		const experiment = createPromptExperiment(source);

		examples.splice(0, examples.length);

		const requests: PromptExecutionRequest[] = [];
		const executePrompt: PromptExecutor = async (request) => {
			requests.push(request);
			return "BETA";
		};
		const run = await experiment.evaluate({
			executePrompt,
			provider: "test-provider",
			modelId: "test-model",
			temperature: 0,
			structuredOutputMode: "raw-text",
			retryPolicy: {
				maxAttempts: 1,
				backoffMs: 0,
				jitter: false,
			},
			executedAt: "2026-05-09T00:00:00.000Z",
		});

		expect(Object.isFrozen(experiment)).toBe(true);
		expect(Object.isFrozen(experiment.build)).toBe(true);
		expect(experiment.build.usedExampleIds).toEqual(["uppercase-1"]);
		expect(experiment.build.evalExampleIds).toEqual(["uppercase-2"]);
		expect(requests).toEqual([
			{
				systemPrompt: experiment.build.systemPrompt,
				input: "beta",
				outputSchema: undefined,
			},
		]);
		expect(run.sourceVersion).toBe(experiment.build.sourceVersion);
		expect(run.buildVersion).toBe(experiment.build.buildVersion);
		expect(run.results).toEqual([
			{
				exampleId: "uppercase-2",
				exampleIndex: 1,
				contentMatched: true,
				rawAgentResponse: "BETA",
			},
		]);
	});

	test("rejects an invalid retry policy before calling the executor", async () => {
		const experiment = createPromptExperiment(deClassifyPromptSource);
		let executionCount = 0;

		await expect(
			experiment.evaluate({
				executePrompt: async () => {
					executionCount += 1;
					return "{}";
				},
				provider: "test-provider",
				modelId: "test-model",
				temperature: 0,
				structuredOutputMode: "json",
				retryPolicy: {
					maxAttempts: 0,
					backoffMs: -1,
					jitter: false,
				},
			}),
		).rejects.toThrow(PromptExperimentConfigurationError);

		expect(executionCount).toBe(0);
	});
});

describe("buildPrompt", () => {
	test("builds deterministically from the same source", () => {
		const firstBuild = buildPrompt(deClassifyPromptSource);
		const secondBuild = buildPrompt(deClassifyPromptSource);

		expect(firstBuild).toEqual(secondBuild);
		expect(firstBuild.usedExampleIds).toEqual([
			"de-classify-001",
			"de-classify-002",
		]);
		expect(firstBuild.evalExampleIds).toEqual(["de-classify-003"]);
		expect(firstBuild.numOfExamplesUsed).toBe(2);
		expect(firstBuild.systemPrompt).toContain("Response format:");
		expect(firstBuild.systemPrompt).toContain(
			'"label": enum(literal | idiomatic)',
		);
	});

	test("changes sourceVersion when example order changes", () => {
		const [firstExample, secondExample, thirdExample] =
			deClassifyPromptSource.examples;
		if (!firstExample || !secondExample || !thirdExample) {
			throw new Error("deClassifyPromptSource fixture is incomplete");
		}
		const reorderedSource = {
			...deClassifyPromptSource,
			examples: [secondExample, firstExample, thirdExample],
		};

		expect(buildPrompt(reorderedSource).sourceVersion).not.toBe(
			buildPrompt(deClassifyPromptSource).sourceVersion,
		);
	});

	test("throws a validation error for duplicate example ids", () => {
		expect(() =>
			buildPrompt({
				taskDescription: "Classify the string.",
				examples: [
					{ id: "dup", input: "a", idealOutput: "A" },
					{ id: "dup", input: "b", idealOutput: "B" },
				],
				numOfFirstExamplesToUse: 1,
			}),
		).toThrow(PromptInfraValidationError);
	});

	test("validates example outputs against outputSchema", () => {
		expect(() =>
			buildPrompt({
				taskDescription: "Return a strict shape.",
				examples: [
					{
						id: "shape-1",
						input: "one",
						idealOutput: { label: "ok" },
					},
					{
						id: "shape-2",
						input: "two",
						idealOutput: { label: 2 },
					},
				],
				numOfFirstExamplesToUse: 1,
				outputSchema: z.object({
					label: z.string(),
				}),
			}),
		).toThrow(PromptInfraValidationError);
	});
});

describe("evaluatePromptBuild", () => {
	test("keeps rejecting mismatched compatibility source and build pairs", async () => {
		const build = buildPrompt(deClassifyPromptSource);

		await expect(
			evaluatePromptBuild({
				source: {
					...deClassifyPromptSource,
					taskDescription: `${deClassifyPromptSource.taskDescription} Changed.`,
				},
				build,
				executePrompt: async () => "{}",
				provider: "test-provider",
				modelId: "test-model",
				temperature: 0,
				structuredOutputMode: "json",
				retryPolicy: {
					maxAttempts: 1,
					backoffMs: 0,
					jitter: false,
				},
			}),
		).rejects.toThrow(
			"PromptBuild sourceVersion does not match PromptSource",
		);
	});

	test("parses schema-based responses and compares parsed content", async () => {
		const build = buildPrompt(deClassifyPromptSource);
		const run = await evaluatePromptBuild({
			source: deClassifyPromptSource,
			build,
			executePrompt: async () =>
				JSON.stringify({
					label: "literal",
					reason: "Der Satz beschreibt direkt ein Sitzmoebel.",
				}),
			provider: "test-provider",
			modelId: "test-model",
			temperature: 0,
			structuredOutputMode: "json",
			retryPolicy: {
				maxAttempts: 1,
				backoffMs: 0,
				jitter: false,
			},
			executedAt: "2026-05-09T00:00:00.000Z",
		});

		expect(run.results).toEqual([
			{
				exampleId: "de-classify-003",
				exampleIndex: 2,
				contentMatched: true,
				rawAgentResponse:
					'{"label":"literal","reason":"Der Satz beschreibt direkt ein Sitzmoebel."}',
				shapeMatched: true,
				parsedAgentResponse: {
					label: "literal",
					reason: "Der Satz beschreibt direkt ein Sitzmoebel.",
				},
			},
		]);
	});

	test("records parse failures when outputSchema exists", async () => {
		const build = buildPrompt(deClassifyPromptSource);
		const run = await evaluatePromptBuild({
			source: deClassifyPromptSource,
			build,
			executePrompt: async () => "not json",
			provider: "test-provider",
			modelId: "test-model",
			temperature: 0,
			structuredOutputMode: "json",
			retryPolicy: {
				maxAttempts: 1,
				backoffMs: 0,
				jitter: false,
			},
			executedAt: "2026-05-09T00:00:00.000Z",
		});

		expect(run.results[0]?.contentMatched).toBe(false);
		expect(run.results[0]?.shapeMatched).toBe(false);
		expect(run.results[0]?.parseError).toContain("JSON");
	});

	test("uses strict raw response equality when no outputSchema exists", async () => {
		const source = {
			taskDescription: "Return an uppercase copy.",
			examples: [
				{
					id: "uppercase-1",
					input: "alpha",
					idealOutput: "ALPHA",
				},
				{
					id: "uppercase-2",
					input: "beta",
					idealOutput: "BETA",
				},
			],
			numOfFirstExamplesToUse: 1,
		} as const;
		const build = buildPrompt(source);
		const run = await evaluatePromptBuild({
			source,
			build,
			executePrompt: async () => "BETA",
			provider: "test-provider",
			modelId: "test-model",
			temperature: 0,
			structuredOutputMode: "raw-text",
			retryPolicy: {
				maxAttempts: 1,
				backoffMs: 0,
				jitter: false,
			},
			executedAt: "2026-05-09T00:00:00.000Z",
		});

		expect(run.results).toEqual([
			{
				exampleId: "uppercase-2",
				exampleIndex: 1,
				contentMatched: true,
				rawAgentResponse: "BETA",
			},
		]);
	});
});
