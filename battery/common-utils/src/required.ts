/** Return a present value or fail with a caller-owned invariant message. */
export function required<T>(
	value: T | undefined,
	message = "Expected value",
): T {
	if (value === undefined) throw Error(message);
	return value;
}
