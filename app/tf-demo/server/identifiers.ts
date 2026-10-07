/**
 * The bound on the identifiers and keys the backend stores: request, visitor
 * and attempt keys, diagnostic ids, and Catalog Growth Signal labels.
 */
export const MAX_IDENTIFIER_LENGTH = 200;

/**
 * Rejects a value that is blank after trimming. The `typeof` guard also
 * catches callers that are untyped at runtime.
 */
export function assertNonEmpty(value: string, name: string): void {
	if (typeof value !== "string" || value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

/** Rejects an identifier that is blank after trimming or over the bound. */
export function assertIdentifier(value: string, name: string): void {
	if (value.trim().length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
		throw new Error(
			`${name} must contain 1 to ${MAX_IDENTIFIER_LENGTH} characters.`,
		);
	}
}
