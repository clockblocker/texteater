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
	const leftKeys = Object.keys(left);
	return (
		leftKeys.length === Object.keys(right).length &&
		leftKeys.every(
			(key) =>
				Object.hasOwn(right, key) &&
				sameValue(
					(left as Record<string, unknown>)[key],
					(right as Record<string, unknown>)[key],
				),
		)
	);
}
