/** The message of a thrown value: an `Error`'s own message, or anything else as a string. */
export function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
