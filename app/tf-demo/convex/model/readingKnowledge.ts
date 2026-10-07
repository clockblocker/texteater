import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import { parseGermanReading } from "../../server/operationalParsing";
export type AnyRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is AnyRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requireRecord(value: unknown, context: string): AnyRecord {
	if (!isRecord(value)) throw new Error(`${context} must be an object.`);
	return value;
}

export function requireString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty string.`);
	}
	return value;
}

export function withoutKeys(
	record: AnyRecord,
	keys: readonly string[],
): AnyRecord {
	const result = { ...record };
	for (const key of keys) delete result[key];
	return result;
}

/** Revalidates persisted Knowledge against its source before every change. */
export function applyTrustedReadingKnowledgeChange(
	sourceValue: unknown,
	existingValue: unknown,
	change: unknown,
): AnyRecord {
	const source = parseGermanReading(sourceValue);
	const current = parseReadingKnowledge({
		source,
		knowledge: existingValue ?? {},
	});
	if (!current.success) throw current.error;
	const next = applyKnowledgeChange({
		source,
		knowledge: current.value,
		change,
	});
	if (!next.success) throw next.error;
	return next.value;
}
