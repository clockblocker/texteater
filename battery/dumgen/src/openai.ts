import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
	hashString,
	stableStringify,
} from "./internal/prompt-infra/serialize/stable-stringify";
import type {
	PromptExecutionRequest,
	PromptExecutor,
} from "./internal/prompt-infra/types";

export const GPT_5_NANO_MODEL = "gpt-5-nano";

const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const RESPONSE_SCHEMA_NAME = "dumgen_response";

export type OpenAIPromptExecutorOptions = {
	/**
	 * Defaults to OPENAI_API_KEY through the OpenAI SDK.
	 */
	readonly apiKey?: string;
	readonly client?: OpenAI;
	readonly maxOutputTokens?: number;
	readonly model?: string;
};

export class DumgenOpenAIResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DumgenOpenAIResponseError";
	}
}

/**
 * Creates a server-side PromptExecutor backed by the OpenAI Responses API.
 *
 * Keep this function and its API key out of browser bundles.
 */
export function createOpenAIPromptExecutor(
	options: OpenAIPromptExecutorOptions = {},
): PromptExecutor {
	const client = options.client ?? new OpenAI({ apiKey: options.apiKey });
	const model = options.model ?? GPT_5_NANO_MODEL;
	const maxOutputTokens =
		options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

	if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1) {
		throw new TypeError("maxOutputTokens must be a positive safe integer.");
	}

	return async (request) => {
		const commonRequest = createCommonRequest({
			request,
			model,
			maxOutputTokens,
		});

		if (!request.outputSchema) {
			const response = await client.responses.create(commonRequest);
			if (!response.output_text) {
				throw createEmptyResponseError(response);
			}
			return response.output_text;
		}

		const response = await client.responses.parse({
			...commonRequest,
			text: {
				format: zodTextFormat(
					request.outputSchema,
					RESPONSE_SCHEMA_NAME,
				),
				verbosity: "low",
			},
		});

		if (response.output_parsed === null) {
			throw createEmptyResponseError(response);
		}

		return stableStringify(response.output_parsed);
	};
}

function createCommonRequest(args: {
	readonly request: PromptExecutionRequest;
	readonly model: string;
	readonly maxOutputTokens: number;
}) {
	return {
		model: args.model,
		input: [
			{
				role: "system" as const,
				content: args.request.systemPrompt,
			},
			{
				role: "user" as const,
				content: stableStringify(args.request.input),
			},
		],
		max_output_tokens: args.maxOutputTokens,
		prompt_cache_key: hashString(args.request.systemPrompt),
		reasoning: {
			effort: "minimal" as const,
		},
		store: false,
		text: {
			verbosity: "low" as const,
		},
	};
}

function createEmptyResponseError(response: {
	readonly incomplete_details?: { readonly reason?: string } | null;
	readonly output?: readonly unknown[];
	readonly status?: string;
}): DumgenOpenAIResponseError {
	const refusal = findRefusal(response.output);
	if (refusal) {
		return new DumgenOpenAIResponseError(
			`OpenAI refused the request: ${refusal}`,
		);
	}

	const detail = response.incomplete_details?.reason ?? response.status;
	return new DumgenOpenAIResponseError(
		detail
			? `OpenAI returned no usable output (${detail}).`
			: "OpenAI returned no usable output.",
	);
}

function findRefusal(
	output: readonly unknown[] | undefined,
): string | undefined {
	if (!output) return undefined;

	for (const item of output) {
		if (!isRecord(item) || !Array.isArray(item.content)) continue;
		for (const content of item.content) {
			if (
				isRecord(content) &&
				content.type === "refusal" &&
				typeof content.refusal === "string"
			) {
				return content.refusal;
			}
		}
	}

	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
