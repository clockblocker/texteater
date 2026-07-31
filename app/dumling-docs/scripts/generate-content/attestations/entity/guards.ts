import type {
	EntityValue,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "dumling/types";

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
		typeof value.canonicalForm === "string" &&
		typeof value.family === "string" &&
		typeof value.kind === "string" &&
		isRecord(value.coreFeatures)
	);
}

export function isSurface(value: unknown): value is Surface<SupportedLanguage> {
	return (
		isRecord(value) &&
		isSupportedLanguage(value.language) &&
		typeof value.normalizedSurface === "string" &&
		(value.spelling === "Canonical" || value.spelling === "Variant") &&
		(value.realizationCoverage === "Full" ||
			value.realizationCoverage === "Partial") &&
		typeof value.surfaceKind === "string" &&
		isLemma(value.lemma)
	);
}

export function isSelection(
	value: unknown,
): value is Selection<SupportedLanguage> {
	return (
		isRecord(value) &&
		typeof value.segmentedSentenceId === "string" &&
		Number.isInteger(value.clickedSegmentIndex) &&
		Array.isArray(value.surfaceSegmentIndices) &&
		value.surfaceSegmentIndices.every(Number.isInteger) &&
		typeof value.attestedSurface === "string" &&
		(value.selectedOrthography === "Standard" ||
			value.selectedOrthography === "Typo") &&
		isSurface(value.surface)
	);
}

export function isEntityValue(value: unknown): value is EntityValue {
	return isSelection(value) || isSurface(value) || isLemma(value);
}
