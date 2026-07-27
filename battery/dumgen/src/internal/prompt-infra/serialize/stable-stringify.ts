import { createHash } from "node:crypto";

export function stableJsonPretty(value: unknown): string {
	const normalized = normalizeForStableSerialization(value);
	return JSON.stringify(normalized, null, 2);
}

export function stableStringify(value: unknown): string {
	const normalized = normalizeForStableSerialization(value);
	return JSON.stringify(normalized);
}

export function hashString(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function normalizeForStableSerialization(value: unknown): unknown {
	if (value === undefined) {
		return {
			__dumgenUndefined: true,
		};
	}

	if (value === null) {
		return null;
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForStableSerialization(item));
	}

	if (typeof value === "object") {
		const entries = Object.entries(value).sort(([left], [right]) =>
			left.localeCompare(right),
		);
		return Object.fromEntries(
			entries.map(([key, nestedValue]) => [
				key,
				normalizeForStableSerialization(nestedValue),
			]),
		);
	}

	return String(value);
}
