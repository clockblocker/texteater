/** Internal equivalent of common-utils.required; dumval does not depend on common-utils. */
export function required<T>(
	value: T | undefined,
	message = "Expected value",
): T {
	if (value === undefined) throw Error(message);
	return value;
}
