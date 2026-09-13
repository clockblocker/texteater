import type { GenerationFailureReason } from "../ai-sdk/ai-sdk-generation-error";
import type { GenerationFailure } from "../ai-sdk/model-generation";

export type DumgenErrorCode =
	| GenerationFailureReason
	| "invalid-input"
	| "invalid-output";

export class DumgenError extends Error {
	readonly code: DumgenErrorCode;
	readonly generationFailure?: GenerationFailure;

	constructor(
		code: DumgenErrorCode,
		message: string,
		options: ErrorOptions & {
			readonly generationFailure?: GenerationFailure;
		} = {},
	) {
		super(message, options);
		this.name = "DumgenError";
		this.code = code;
		if (options.generationFailure) {
			this.generationFailure = options.generationFailure;
		}
	}
}
