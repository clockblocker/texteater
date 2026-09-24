import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import { parseGermanReading } from "../../server/operationalParsing";
export type AnyRecord = Record<string, unknown>;

export function requireRecord(value: unknown, context: string): AnyRecord {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${context} must be an object.`);
	}
	return value as AnyRecord;
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

export function requireChangeKind(
	value: unknown,
): "Contribute" | "Correct" | "Retract" {
	if (value !== "Contribute" && value !== "Correct" && value !== "Retract") {
		throw new Error(`Unsupported Knowledge Change kind: ${String(value)}`);
	}
	return value;
}

export function requireArray(value: unknown, context: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${context} must be an array.`);
	return value;
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
