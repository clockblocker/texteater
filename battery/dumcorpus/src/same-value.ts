/** Deep equality of JSON values, key order aside. */
export function sameValue(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left))
		return (
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => sameValue(item, right[index]))
		);
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object" ||
		Array.isArray(right)
	)
		return false;
	const leftEntries: [string, unknown][] = Object.entries(left);
	const rightValues = new Map<string, unknown>(Object.entries(right));
	return (
		leftEntries.length === rightValues.size &&
		leftEntries.every(
			([key, value]) =>
				rightValues.has(key) && sameValue(value, rightValues.get(key)),
		)
	);
}
