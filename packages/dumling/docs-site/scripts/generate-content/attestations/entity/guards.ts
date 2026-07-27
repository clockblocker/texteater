import type {
	EntityValue,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../../../../src/types/public-types.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

export function isSupportedLanguage(
	value: unknown,
): value is SupportedLanguage {
	return value === "de" || value === "en" || value === "he";
}

export function isLemma(value: unknown): value is Lemma<SupportedLanguage> {
	return (
		isRecord(value) &&
		isSupportedLanguage(value.language) &&
		typeof value.canonicalLemma === "string" &&
		typeof value.lemmaKind === "string" &&
		typeof value.lemmaSubKind === "string" &&
		isRecord(value.inherentFeatures) &&
		typeof value.meaningInEmojis === "string"
	);
}

export function isSurface(value: unknown): value is Surface<SupportedLanguage> {
	return (
		isRecord(value) &&
		isSupportedLanguage(value.language) &&
		typeof value.normalizedFullSurface === "string" &&
		typeof value.surfaceKind === "string" &&
		isLemma(value.lemma)
	);
}

export function isSelection(
	value: unknown,
): value is Selection<SupportedLanguage> {
	return (
		isRecord(value) &&
		isSupportedLanguage(value.language) &&
		typeof value.spelledSelection === "string" &&
		(!("selectionFeatures" in value) ||
			value.selectionFeatures === undefined ||
			isRecord(value.selectionFeatures)) &&
		isSurface(value.surface)
	);
}

export function isEntityValue(value: unknown): value is EntityValue {
	return isSelection(value) || isSurface(value) || isLemma(value);
}
