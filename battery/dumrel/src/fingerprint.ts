/** Structural equality key: equal values give equal keys whatever their key order. */
export function fingerprint(value: unknown): string {
	return JSON.stringify(sort(value));
}

function sort(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sort);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value)
				.toSorted(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, sort(child)]),
		);
	return value;
}
