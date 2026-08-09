import type {
	Attestation,
	EntityValue,
	Lemma,
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
		typeof value.surfaceKind === "string" &&
		isLemma(value.lemma)
	);
}

export function isAttestation(
	value: unknown,
): value is Attestation<SupportedLanguage> {
	return (
		isRecord(value) &&
		Array.isArray(value.members) &&
		value.members.length > 0 &&
		value.members.every(
			(member) =>
				isRecord(member) &&
				typeof member.attested === "string" &&
				member.attested.length > 0 &&
				(member.orthography === "Standard" ||
					member.orthography === "Typo"),
		) &&
		(value.realizationCoverage === "Full" ||
			value.realizationCoverage === "Partial") &&
		isSurface(value.surface)
	);
}

export function isEntityValue(value: unknown): value is EntityValue {
	return isAttestation(value) || isSurface(value) || isLemma(value);
}
