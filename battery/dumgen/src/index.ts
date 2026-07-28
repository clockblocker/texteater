import { buildPrompt } from "./internal/prompt-infra";
import { deClassifyPromptSource } from "./internal/prompt-infra/fixtures/de/classify";
import type { PromptExecutor } from "./internal/prompt-infra/types";

export type { OpenAIPromptExecutorOptions } from "./openai";
export {
	createOpenAIPromptExecutor,
	DumgenOpenAIResponseError,
	GPT_5_NANO_MODEL,
} from "./openai";

export type DumgenPrompt = {
	readonly kind: "prompt";
	readonly content: string;
};

export type DumgenLlmCaller = PromptExecutor;

export type DeClassification = {
	readonly label: "literal" | "idiomatic";
	readonly reason: string;
};

export type DumgenRuntime = {
	readonly de: {
		readonly classify: (
			sentence: string,
			selection: string,
		) => Promise<DeClassification>;
	};
};

const deClassifyPrompt = buildPrompt(deClassifyPromptSource);

export function createPrompt(content: string): DumgenPrompt {
	return {
		kind: "prompt",
		content,
	};
}

export function buildDumgen(executePrompt: DumgenLlmCaller): DumgenRuntime {
	return {
		de: {
			async classify(sentence, selection) {
				const input = { sentence, selection };
				deClassifyPromptSource.inputSchema?.parse(input);

				const rawResponse = await executePrompt({
					systemPrompt: deClassifyPrompt.systemPrompt,
					input,
					outputSchema: deClassifyPromptSource.outputSchema,
				});

				return parseClassification(rawResponse);
			},
		},
	};
}

function parseClassification(rawResponse: string): DeClassification {
	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(rawResponse);
	} catch (error) {
		throw new Error("The language model returned invalid JSON.", {
			cause: error,
		});
	}

	const parsed = deClassifyPromptSource.outputSchema?.parse(parsedJson);
	if (!parsed) {
		throw new Error("The German classification output schema is missing.");
	}

	return parsed as DeClassification;
}
