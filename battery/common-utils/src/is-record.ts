/** Whether a value is a non-null object other than an array, whose keys can be read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
