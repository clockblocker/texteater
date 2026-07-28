import type { ZodType } from "zod";

export type PromptExample = {
	readonly id: string;
	readonly input: unknown;
	readonly idealOutput: unknown;
};

export type PromptSource = {
	readonly taskDescription: string;
	readonly examples: readonly PromptExample[];
	readonly numOfFirstExamplesToUse: number;
	readonly agentRole?: string;
	readonly inputSchema?: ZodType;
	readonly outputSchema?: ZodType;
};

export type PromptBuild = {
	readonly systemPrompt: string;
	readonly sourceVersion: string;
	readonly buildVersion: string;
	readonly numOfExamplesUsed: number;
	readonly usedExampleIds: readonly string[];
	readonly evalExampleIds: readonly string[];
	readonly rendererVersion: string;
};

export type EvaluationResult = {
	readonly exampleId: string;
	readonly exampleIndex: number;
	readonly contentMatched: boolean;
	readonly rawAgentResponse: string;
	readonly shapeMatched?: boolean;
	readonly parsedAgentResponse?: unknown;
	readonly parseError?: string;
	readonly comparisonError?: string;
};

export type EvaluationRun = {
	readonly sourceVersion: string;
	readonly buildVersion: string;
	readonly provider: string;
	readonly modelId: string;
	readonly temperature: number;
	readonly topP?: number;
	readonly seed?: number;
	readonly maxOutputTokens?: number;
	readonly structuredOutputMode: string;
	readonly retryPolicy: {
		readonly maxAttempts: number;
		readonly backoffMs: number;
		readonly jitter: boolean;
	};
	readonly executedAt: string;
	readonly results: readonly EvaluationResult[];
};

export type PromptExecutionRequest = {
	readonly systemPrompt: string;
	readonly input: unknown;
	readonly outputSchema?: ZodType;
};

export type PromptExecutor = (
	request: PromptExecutionRequest,
) => Promise<string>;

export type PromptRetryPolicy = {
	readonly maxAttempts: number;
	readonly backoffMs: number;
	readonly jitter: boolean;
};

export type PromptEvaluationOptions = {
	readonly executePrompt: PromptExecutor;
	readonly provider: string;
	readonly modelId: string;
	readonly temperature: number;
	readonly topP?: number;
	readonly seed?: number;
	readonly maxOutputTokens?: number;
	readonly structuredOutputMode: string;
	readonly retryPolicy: PromptRetryPolicy;
	readonly executedAt?: string;
};

export type PromptExperiment = {
	readonly build: PromptBuild;
	readonly evaluate: (
		options: PromptEvaluationOptions,
	) => Promise<EvaluationRun>;
};

export type CreatePromptExperimentOptions = {
	readonly rendererVersion?: string;
};

export type EvaluatePromptBuildOptions = PromptEvaluationOptions & {
	readonly source: PromptSource;
	readonly build: PromptBuild;
};
