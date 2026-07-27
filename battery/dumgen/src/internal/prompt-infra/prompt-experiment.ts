import { isDeepStrictEqual } from "node:util";

import {
	PROMPT_RENDERER_VERSION,
	SCHEMA_FORMAT_RENDERING_MODE,
} from "./constants";
import { PromptExperimentConfigurationError } from "./errors";
import { renderSystemPrompt } from "./render/render-system-prompt";
import { serializePromptSource } from "./serialize/serialize-prompt-source";
import { hashString, stableStringify } from "./serialize/stable-stringify";
import type {
	CreatePromptExperimentOptions,
	EvaluationResult,
	EvaluationRun,
	PromptBuild,
	PromptEvaluationOptions,
	PromptExample,
	PromptExperiment,
	PromptRetryPolicy,
	PromptSource,
} from "./types";
import { validatePromptSource } from "./validate-prompt-source";

type EvaluationExample = {
	readonly example: PromptExample;
	readonly exampleIndex: number;
};

type PromptCorpus = {
	readonly evaluation: readonly EvaluationExample[];
	readonly used: readonly PromptExample[];
};

export function createPromptExperiment(
	source: PromptSource,
	options: CreatePromptExperimentOptions = {},
): PromptExperiment {
	const ownedSource = ownPromptSource(source);
	validatePromptSource(ownedSource);

	const corpus = splitPromptCorpus(ownedSource);
	const build = createBuild(
		ownedSource,
		corpus,
		options.rendererVersion ?? PROMPT_RENDERER_VERSION,
	);

	return Object.freeze({
		build,
		evaluate: (evaluationOptions: PromptEvaluationOptions) =>
			evaluateExperiment(
				ownedSource,
				corpus.evaluation,
				build,
				evaluationOptions,
			),
	});
}

function ownPromptSource(source: PromptSource): PromptSource {
	const examples = source.examples.map((example) =>
		Object.freeze({ ...example }),
	);

	return Object.freeze({
		...source,
		examples: Object.freeze(examples),
	});
}

function splitPromptCorpus(source: PromptSource): PromptCorpus {
	const used = source.examples.slice(0, source.numOfFirstExamplesToUse);
	const evaluation = source.examples
		.slice(source.numOfFirstExamplesToUse)
		.map((example, offset) =>
			Object.freeze({
				example,
				exampleIndex: source.numOfFirstExamplesToUse + offset,
			}),
		);

	return Object.freeze({
		evaluation: Object.freeze(evaluation),
		used: Object.freeze(used),
	});
}

function createBuild(
	source: PromptSource,
	corpus: PromptCorpus,
	rendererVersion: string,
): PromptBuild {
	const sourceVersion = hashString(serializePromptSource(source));
	const buildVersion = hashString(
		stableStringify({
			rendererVersion,
			schemaFormatRenderingMode: SCHEMA_FORMAT_RENDERING_MODE,
			sourceVersion,
		}),
	);

	return Object.freeze({
		systemPrompt: renderSystemPrompt(source, corpus.used),
		sourceVersion,
		buildVersion,
		numOfExamplesUsed: corpus.used.length,
		usedExampleIds: Object.freeze(corpus.used.map((example) => example.id)),
		evalExampleIds: Object.freeze(
			corpus.evaluation.map(({ example }) => example.id),
		),
		rendererVersion,
	});
}

async function evaluateExperiment(
	source: PromptSource,
	evaluationExamples: readonly EvaluationExample[],
	build: PromptBuild,
	options: PromptEvaluationOptions,
): Promise<EvaluationRun> {
	const retryPolicy = ownAndValidateRetryPolicy(options.retryPolicy);
	const results: EvaluationResult[] = [];

	for (const { example, exampleIndex } of evaluationExamples) {
		const rawAgentResponse = await executeWithRetry(
			() =>
				options.executePrompt({
					systemPrompt: build.systemPrompt,
					input: example.input,
					outputSchema: source.outputSchema,
				}),
			retryPolicy,
			example.id,
		);
		results.push(
			evaluateExampleResult({
				example,
				exampleIndex,
				outputSchema: source.outputSchema,
				rawAgentResponse,
			}),
		);
	}

	return {
		sourceVersion: build.sourceVersion,
		buildVersion: build.buildVersion,
		provider: options.provider,
		modelId: options.modelId,
		temperature: options.temperature,
		topP: options.topP,
		seed: options.seed,
		maxOutputTokens: options.maxOutputTokens,
		structuredOutputMode: options.structuredOutputMode,
		retryPolicy,
		executedAt: options.executedAt ?? new Date().toISOString(),
		results,
	};
}

function ownAndValidateRetryPolicy(
	retryPolicy: PromptRetryPolicy,
): PromptRetryPolicy {
	const issues: string[] = [];

	if (
		!Number.isSafeInteger(retryPolicy.maxAttempts) ||
		retryPolicy.maxAttempts < 1
	) {
		issues.push("retryPolicy.maxAttempts must be a positive safe integer");
	}
	if (!Number.isFinite(retryPolicy.backoffMs) || retryPolicy.backoffMs < 0) {
		issues.push("retryPolicy.backoffMs must be a finite number >= 0");
	}
	if (typeof retryPolicy.jitter !== "boolean") {
		issues.push("retryPolicy.jitter must be a boolean");
	}

	if (issues.length > 0) {
		throw new PromptExperimentConfigurationError(issues);
	}

	return Object.freeze({ ...retryPolicy });
}

function evaluateExampleResult(args: {
	readonly example: PromptExample;
	readonly exampleIndex: number;
	readonly outputSchema?: PromptSource["outputSchema"];
	readonly rawAgentResponse: string;
}): EvaluationResult {
	const { example, exampleIndex, outputSchema, rawAgentResponse } = args;

	if (!outputSchema) {
		try {
			return {
				exampleId: example.id,
				exampleIndex,
				contentMatched: rawAgentResponse === example.idealOutput,
				rawAgentResponse,
			};
		} catch (error) {
			return {
				exampleId: example.id,
				exampleIndex,
				contentMatched: false,
				rawAgentResponse,
				comparisonError: getErrorMessage(error),
			};
		}
	}

	const parsedJson = parseJson(rawAgentResponse);
	if (!parsedJson.success) {
		return {
			exampleId: example.id,
			exampleIndex,
			contentMatched: false,
			rawAgentResponse,
			shapeMatched: false,
			parseError: parsedJson.error,
		};
	}

	const parsedSchema = outputSchema.safeParse(parsedJson.value);
	if (!parsedSchema.success) {
		return {
			exampleId: example.id,
			exampleIndex,
			contentMatched: false,
			rawAgentResponse,
			shapeMatched: false,
			parseError: parsedSchema.error.message,
		};
	}

	try {
		return {
			exampleId: example.id,
			exampleIndex,
			contentMatched: isDeepStrictEqual(
				parsedSchema.data,
				example.idealOutput,
			),
			rawAgentResponse,
			shapeMatched: true,
			parsedAgentResponse: parsedSchema.data,
		};
	} catch (error) {
		return {
			exampleId: example.id,
			exampleIndex,
			contentMatched: false,
			rawAgentResponse,
			shapeMatched: true,
			parsedAgentResponse: parsedSchema.data,
			comparisonError: getErrorMessage(error),
		};
	}
}

async function executeWithRetry(
	execute: () => Promise<string>,
	retryPolicy: PromptRetryPolicy,
	exampleId: string,
): Promise<string> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
		try {
			return await execute();
		} catch (error) {
			lastError = error;
			if (attempt === retryPolicy.maxAttempts) {
				break;
			}

			const delayMs = getRetryDelayMs(retryPolicy, attempt);
			await delay(delayMs);
		}
	}

	throw new Error(
		`Prompt execution failed for example "${exampleId}" after ${retryPolicy.maxAttempts} attempt(s): ${getErrorMessage(lastError)}`,
	);
}

function getRetryDelayMs(
	retryPolicy: PromptRetryPolicy,
	attempt: number,
): number {
	if (retryPolicy.backoffMs === 0) {
		return 0;
	}

	const baseDelay = retryPolicy.backoffMs * attempt;
	if (!retryPolicy.jitter) {
		return baseDelay;
	}

	return Math.floor(baseDelay * 0.5);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(value: string):
	| { readonly success: true; readonly value: unknown }
	| {
			readonly success: false;
			readonly error: string;
	  } {
	try {
		return {
			success: true,
			value: JSON.parse(value),
		};
	} catch (error) {
		return {
			success: false,
			error: getErrorMessage(error),
		};
	}
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
