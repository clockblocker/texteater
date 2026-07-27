import type {
	EntityKind,
	EntityValue,
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../../../../src/types/public-types.ts";
import { isSelection, isSurface } from "./guards";

export function languageLabelFor(language: SupportedLanguage): string {
	const labels: Record<SupportedLanguage, string> = {
		de: "German",
		en: "English",
		he: "Hebrew",
	};
	return labels[language];
}

export function entityKindFor(value: EntityValue): EntityKind {
	if (isSelection(value)) {
		return "Selection";
	}
	if (isSurface(value)) {
		return "Surface";
	}
	return "Lemma";
}

export function surfaceForEntity(
	value: Surface<SupportedLanguage> | Selection<SupportedLanguage>,
): Surface<SupportedLanguage> {
	return isSelection(value) ? value.surface : value;
}

export function lemmaForEntity(value: EntityValue): Lemma<SupportedLanguage> {
	if (isSelection(value)) {
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
