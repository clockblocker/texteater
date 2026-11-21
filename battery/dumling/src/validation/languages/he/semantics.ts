import type { ValidationOperationEntry } from "../types.js";

/**
 * Hebrew marks its article with `definite: Def` on the noun or adjective it
 * prefixes, and only such a form, or a proper noun cited with its article,
 * names article evidence; a `Def` form may name none (ADR 0040).
 */
export function isHebrewArticleAttestation(value: {
	surface: {
		inflectionalFeatures: { definite?: string | null } | null;
		lemma: { kind: string; coreFeatures: { article?: string | null } };
	};
	articleEvidence?: unknown;
}): boolean {
	const { surface } = value;
	if (!value.articleEvidence) return true;
	return surface.lemma.kind === "PROPN"
		? surface.lemma.coreFeatures.article === "Definite"
		: surface.inflectionalFeatures?.definite === "Def";
}
export function hebrewArticleAttestationError(): string {
	return "A Hebrew Head names article evidence only on a Def form, or as a proper noun cited with its article";
}

/** Hebrew-specific validation operations, registered in `operationTable`. */
export const heValidationOperations = [
	{
		construct: "custom",
		implementation: isHebrewArticleAttestation,
		error: hebrewArticleAttestationError,
		name: "dumling.he-article.attestation",
		version: 1,
	},
] as const satisfies readonly ValidationOperationEntry[];
