export function stableJson(value: unknown): string {
	return JSON.stringify(normalize(value));
}

export async function fingerprint(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(stableJson(value));
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(hash), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
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
