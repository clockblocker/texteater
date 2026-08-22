/** Canonical JSON for stable operational identity and structural equality. */
export function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(
				([key, member]) =>
					`${JSON.stringify(key)}:${canonicalJson(member)}`,
			)
			.join(",")}}`;
	}
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		throw new TypeError(
			"Canonical JSON accepts JSON-compatible values only.",
		);
	}
	return serialized;
}

export function sameCanonicalJson(left: unknown, right: unknown): boolean {
	return canonicalJson(left) === canonicalJson(right);
}
