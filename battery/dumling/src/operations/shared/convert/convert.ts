import type {
	Lemma,
	Selection,
	SelectionOptionsFor,
	SupportedLanguage,
	Surface,
} from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";

function buildSelectionFromSurface<L extends SupportedLanguage>(
	surface: Surface<L>,
	options: SelectionOptionsFor,
): Selection<L> {
	return {
		...options,
		surface,
	} as unknown as Selection<L>;
}

export function buildConvertOperations<
	L extends SupportedLanguage,
>(): LanguageApi<L>["convert"] {
	return {
		lemma: {
			toSurface(lemma: Lemma<L>) {
				return {
					language: lemma.language,
					normalizedSurface: lemma.canonicalForm,
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Citation",
					surfaceFeatures: null,
					lemma,
				} as unknown as ReturnType<
					LanguageApi<L>["convert"]["lemma"]["toSurface"]
				>;
			},
			toSelection(lemma: Lemma<L>, options: SelectionOptionsFor) {
				return buildSelectionFromSurface(
					{
						language: lemma.language,
						normalizedSurface: lemma.canonicalForm,
						spelling: "Canonical",
						realizationCoverage: "Full",
						surfaceKind: "Citation",
						surfaceFeatures: null,
						lemma,
					} as unknown as Surface<L>,
					options,
				);
			},
		},
		surface: {
			toSelection(surface: Surface<L>, options: SelectionOptionsFor) {
				return buildSelectionFromSurface(surface, options);
			},
		},
	} as unknown as LanguageApi<L>["convert"];
}
