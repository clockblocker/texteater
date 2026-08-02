export type GenerationFailureReason =
	| "refusal"
	| "max-output-tokens"
	| "content-filter"
	| "provider-error";

export class AiSdkGenerationError extends Error {
	readonly reason: GenerationFailureReason;

	constructor(
		reason: GenerationFailureReason,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "AiSdkGenerationError";
		this.reason = reason;
	}
}
