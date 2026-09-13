import type * as Dumling from "dumling/types";

import { isAttestation, isSurface } from "./guards";

export function languageLabelFor(language: Dumling.Language): string {
	const labels: Record<Dumling.Language, string> = {
		de: "German",
		en: "English",
		he: "Hebrew",
	};
	return labels[language];
}

export function entityKindFor(
	value: Dumling.Lemma | Dumling.Surface | Dumling.Attestation,
): Dumling.UnitKind {
	if (isAttestation(value)) {
		return "Attestation";
	}
	if (isSurface(value)) {
		return "Surface";
	}
	return "Lemma";
}

export function surfaceForEntity(
	value:
		| Dumling.Surface<Dumling.Language>
		| Dumling.Attestation<Dumling.Language>,
): Dumling.Surface<Dumling.Language> {
	return isAttestation(value) ? value.surface : value;
}

export function lemmaForEntity(
	value: Dumling.Lemma | Dumling.Surface | Dumling.Attestation,
): Dumling.Lemma<Dumling.Language> {
	if (isAttestation(value)) {
		return value.surface.lemma;
	}
	if (isSurface(value)) {
		return value.lemma;
	}
	return value;
}

export function camelCaseIdentifier(text: string, fallback: string): string {
	const words = text
		.normalize("NFKD")
		.replace(/[^\dA-Za-z]+/gu, " ")
		.trim()
		.split(/\s+/u)
		.filter(Boolean);

	if (words.length === 0) {
		return fallback;
	}

	const identifier = words
		.map((word, index) => {
			const lower = word.toLowerCase();
			return index === 0
				? lower
				: `${lower[0]?.toUpperCase() ?? ""}${lower.slice(1)}`;
		})
		.join("");

	return /^\d/u.test(identifier) ? `${fallback}${identifier}` : identifier;
}
