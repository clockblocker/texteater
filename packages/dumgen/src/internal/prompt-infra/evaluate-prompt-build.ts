import { isDeepStrictEqual } from "node:util";

import { buildPrompt } from "./build-prompt";
import type {
	EvaluatePromptBuildOptions,
	EvaluationResult,
	PromptBuild,
	PromptExample,
	PromptSource,
} from "./types";
import { validatePromptSource } from "./validate-prompt-source";

export async function evaluatePromptBuild(options: EvaluatePromptBuildOptions) {
	const { source, build } = options;

	validatePromptSource(source);
	validateBuildMatchesSource(build, source);

	const results: EvaluationResult[] = [];
	const evalExamples = source.examples.slice(source.numOfFirstExamplesToUse);

	for (const [offset, example] of evalExamples.entries()) {
		const exampleIndex = source.numOfFirstExamplesToUse + offset;
		const rawAgentResponse = await executeWithRetry(
			() =>
				options.executePrompt({
					systemPrompt: build.systemPrompt,
					input: example.input,
					outputSchema: source.outputSchema,
				}),
			options.retryPolicy,
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
		retryPolicy: options.retryPolicy,
		executedAt: options.executedAt ?? new Date().toISOString(),
		results,
	};
}

function validateBuildMatchesSource(
	build: PromptBuild,
	source: PromptSource,
): void {
	const expectedBuild = buildPrompt(source, {
		rendererVersion: build.rendererVersion,
	});

	if (build.sourceVersion !== expectedBuild.sourceVersion) {
		throw new Error(
			"PromptBuild sourceVersion does not match PromptSource",
		);
	}

	if (build.buildVersion !== expectedBuild.buildVersion) {
		throw new Error("PromptBuild buildVersion does not match PromptSource");
	}

	if (build.systemPrompt !== expectedBuild.systemPrompt) {
		throw new Error("PromptBuild systemPrompt does not match PromptSource");
	}
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
	retryPolicy: EvaluatePromptBuildOptions["retryPolicy"],
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
	retryPolicy: EvaluatePromptBuildOptions["retryPolicy"],
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
