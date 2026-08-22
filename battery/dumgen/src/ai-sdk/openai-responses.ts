import { AiSdkGenerationError } from "./ai-sdk-generation-error";
import {
	createGenerationFailure,
	type GenerationFailure,
} from "./model-generation";
import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "./model-policy";

export const DEFAULT_MAX_OUTPUT_TOKENS = 256;
export const RESPONSE_SCHEMA_NAME = "dumgen_response";
export const STRUCTURED_OUTPUT_RETRY_MIN_TOKENS = 1024;

export type GenerationParams = {
	readonly maxOutputTokens?: number;
	readonly model?: string;
	readonly systemPrompt?: string;
};

export type ResponseFailureMetadata = {
	readonly incomplete_details?: { readonly reason?: string } | null;
	readonly output?: readonly unknown[];
	readonly status?: string;
};

export async function createCommonRequest(args: {
	readonly defaultMaxOutputTokens?: number;
	readonly defaultModel?: string;
	readonly input: string;
	readonly params: GenerationParams;
}) {
	const maxOutputTokens =
		args.params.maxOutputTokens ??
		args.defaultMaxOutputTokens ??
		DEFAULT_MAX_OUTPUT_TOKENS;
	validateMaxOutputTokens(maxOutputTokens);

	const systemPrompt = args.params.systemPrompt;
	const input = systemPrompt
		? [
				{ role: "system" as const, content: systemPrompt },
				{ role: "user" as const, content: args.input },
			]
		: args.input;

	return {
		model:
			args.params.model ?? args.defaultModel ?? DUMGEN_GENERATION_MODEL,
		input,
		max_output_tokens: maxOutputTokens,
		...(systemPrompt
			? { prompt_cache_key: await hashString(systemPrompt) }
			: undefined),
		reasoning: { effort: DUMGEN_REASONING_EFFORT },
		store: false,
		text: { verbosity: "low" as const },
	};
}

export function validateMaxOutputTokens(maxOutputTokens: number): void {
	if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1) {
		throw new TypeError("maxOutputTokens must be a positive safe integer.");
	}
}

export function exhaustedOutputTokenBudget(
	response: ResponseFailureMetadata,
): boolean {
	return (
		response.status === "incomplete" &&
		response.incomplete_details?.reason === "max_output_tokens"
	);
}

export function assertResponseCompleted(
	response: ResponseFailureMetadata,
): void {
	if (response.status !== undefined && response.status !== "completed") {
		throw createResponseError(response);
	}
}

export function createResponseError(
	response: ResponseFailureMetadata,
	metadata: {
		readonly attempts?: number;
		readonly providerRequestId?: string;
	} = {},
): AiSdkGenerationError {
	const refusal = findRefusal(response.output);
	if (refusal) {
		return new AiSdkGenerationError(
			"refusal",
			"OpenAI refused the request.",
			{
				failure: generationFailure("Refusal", metadata),
			},
		);
	}

	const detail = response.incomplete_details?.reason ?? response.status;
	const reason =
		detail === "max_output_tokens"
			? "max-output-tokens"
			: detail === "content_filter"
				? "content-filter"
				: "provider-error";
	return new AiSdkGenerationError(
		reason,
		detail
			? `OpenAI returned no usable output (${detail}).`
			: "OpenAI returned no usable output.",
		{
			failure: generationFailure(
				reason === "max-output-tokens"
					? "BudgetExhausted"
					: reason === "content-filter"
						? "RequestRejected"
						: "InvalidOutput",
				metadata,
			),
		},
	);
}

function generationFailure(
	category: GenerationFailure["category"],
	metadata: {
		readonly attempts?: number;
		readonly providerRequestId?: string;
	},
): GenerationFailure {
	return createGenerationFailure({
		attempts: metadata.attempts ?? 1,
		category,
		...(metadata.providerRequestId
			? { providerRequestId: metadata.providerRequestId }
			: {}),
	});
}

export function extractOutputText(
	output: readonly unknown[] | undefined,
): string | undefined {
	if (!output) return undefined;
	const text: string[] = [];
	for (const item of output) {
		if (!isRecord(item) || !Array.isArray(item.content)) continue;
		for (const content of item.content) {
			if (
				isRecord(content) &&
				content.type === "output_text" &&
				typeof content.text === "string"
			) {
				text.push(content.text);
			}
		}
	}
	return text.length > 0 ? text.join("") : undefined;
}

async function hashString(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
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
