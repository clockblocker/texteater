import type { IdDecodeError, IdDecodeErrorCode } from "../api-shape.js";

export function idError(
	code: IdDecodeErrorCode,
	message: string,
): IdDecodeError {
	return { code, message };
}
