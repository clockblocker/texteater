import {
	createGenerationFailure,
	type GenerationFailure,
} from "./model-generation";

export type GenerationFailureReason =
	| "refusal"
	| "max-output-tokens"
	| "content-filter"
	| "provider-error";

export class AiSdkGenerationError extends Error {
	readonly failure: GenerationFailure;
	readonly reason: GenerationFailureReason;

	constructor(
		reason: GenerationFailureReason,
		message: string,
		options: ErrorOptions & { readonly failure?: GenerationFailure } = {},
	) {
		super(message, options);
		this.name = "AiSdkGenerationError";
		const failure = createGenerationFailure(
			options.failure ?? {
				attempts: 1,
				category: categoryForReason(reason),
			},
		);
		assertCompatibleReason(reason, failure.category);
		this.reason = reason;
		this.failure = failure;
	}
}

function assertCompatibleReason(
	reason: GenerationFailureReason,
	category: GenerationFailure["category"],
): void {
	const compatible =
		category === "Refusal"
			? reason === "refusal"
			: category === "BudgetExhausted"
				? reason === "max-output-tokens"
				: category === "RequestRejected"
					? reason === "content-filter" || reason === "provider-error"
					: reason === "provider-error";
	if (!compatible) {
		throw new TypeError(
			`Generation failure reason ${reason} is incompatible with category ${category}.`,
		);
	}
}

function categoryForReason(
	reason: GenerationFailureReason,
): GenerationFailure["category"] {
	switch (reason) {
		case "refusal":
			return "Refusal";
		case "max-output-tokens":
			return "BudgetExhausted";
		case "content-filter":
			return "RequestRejected";
		case "provider-error":
			return "ProviderUnavailable";
	}
}
