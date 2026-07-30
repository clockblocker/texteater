export type DumgenErrorCode =
	| "generation-failed"
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
