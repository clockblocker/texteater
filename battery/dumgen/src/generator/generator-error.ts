import type { GenerationFailureReason } from "../ai-sdk/ai-sdk-generation-error";

export type DumgenErrorCode =
	| GenerationFailureReason
	| "invalid-input"
	| "invalid-output";

export class DumgenError extends Error {
	readonly code: DumgenErrorCode;

	constructor(
		code: DumgenErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "DumgenError";
		this.code = code;
	}
}
