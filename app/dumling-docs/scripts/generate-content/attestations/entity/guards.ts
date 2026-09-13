import type * as Dumling from "dumling/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

export function isSupportedLanguage(value: unknown): value is Dumling.Language {
	return value === "de" || value === "en" || value === "he";
}

export function isLemma(
	value: unknown,
): value is Dumling.Lemma<Dumling.Language> {
	return (
		isRecord(value) &&
		value.unitKind === "Lemma" &&
		isSupportedLanguage(value.language) &&
		typeof value.canonicalForm === "string" &&
		typeof value.family === "string" &&
		typeof value.kind === "string" &&
		isRecord(value.coreFeatures)
	);
}

export function isSurface(
	value: unknown,
): value is Dumling.Surface<Dumling.Language> {
	return (
		isRecord(value) &&
		isSupportedLanguage(value.language) &&
		typeof value.normalizedSurface === "string" &&
		(value.spelling === "Canonical" || value.spelling === "Variant") &&
		value.unitKind === "Surface" &&
		isLemma(value.lemma)
	);
}

export function isAttestation(
	value: unknown,
): value is Dumling.Attestation<Dumling.Language> {
	return (
		isRecord(value) &&
		value.unitKind === "Attestation" &&
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

export function isEntityValue(
	value: unknown,
): value is Dumling.Lemma | Dumling.Surface | Dumling.Attestation {
	return isAttestation(value) || isSurface(value) || isLemma(value);
}
