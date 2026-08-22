export type GenerationFailureCategory =
	| "Network"
	| "RateLimited"
	| "ProviderUnavailable"
	| "RequestRejected"
	| "InvalidOutput"
	| "Refusal"
	| "BudgetExhausted";

export type RetryableGenerationFailureCategory =
	| "Network"
	| "RateLimited"
	| "ProviderUnavailable";

export type TerminalGenerationFailureCategory = Exclude<
	GenerationFailureCategory,
	RetryableGenerationFailureCategory
>;

type GenerationFailureMetadata = {
	readonly status?: number;
	readonly providerCode?: string;
	readonly providerRequestId?: string;
	readonly retryAfterMs?: number;
	readonly attempts: number;
};

export type GenerationFailure = GenerationFailureMetadata &
	(
		| {
				readonly category: RetryableGenerationFailureCategory;
				readonly retryable: true;
		  }
		| {
				readonly category: TerminalGenerationFailureCategory;
				readonly retryable: false;
		  }
	);

export type GenerationFailureInput = GenerationFailureMetadata & {
	readonly category: GenerationFailureCategory;
	readonly retryable?: boolean;
};

export function generationFailureCategoryIsRetryable(
	category: GenerationFailureCategory,
): category is RetryableGenerationFailureCategory {
	return (
		category === "Network" ||
		category === "RateLimited" ||
		category === "ProviderUnavailable"
	);
}

export function createGenerationFailure(
	input: GenerationFailureInput,
): GenerationFailure {
	const retryable = generationFailureCategoryIsRetryable(input.category);
	if (input.retryable !== undefined && input.retryable !== retryable) {
		throw new TypeError(
			`Generation failure category ${input.category} cannot have retryable=${input.retryable}.`,
		);
	}
	return Object.freeze({ ...input, retryable }) as GenerationFailure;
}

export type GenerationEvent =
	| {
			readonly kind: "AttemptStarted";
			readonly attempt: number;
			readonly model: string;
	  }
	| {
			readonly kind: "AttemptFailed";
			readonly failure: GenerationFailure;
	  }
	| {
			readonly kind: "RetryScheduled";
			readonly attempt: number;
			readonly delayMs: number;
	  }
	| {
			readonly kind: "Succeeded";
			readonly attempt: number;
			readonly latencyMs: number;
			readonly providerRequestId?: string;
	  };
