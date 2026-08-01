export function stableJson(value: unknown): string {
	return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
	if (value === null) return null;
	if (Array.isArray(value)) return value.map(normalize);
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.toSorted(([left], [right]) => left.localeCompare(right))
				.map(([key, nested]) => [key, normalize(nested)]),
		);
	}
	return value;
}
