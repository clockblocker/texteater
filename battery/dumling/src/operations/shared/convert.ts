import type {
	Lemma,
	Selection,
	SelectionFeatures,
	SupportedLanguage,
	Surface,
} from "../../types/public-types";
import type { LanguageApi } from "../api-shape";
import { requireNonEmptyFeatureBag } from "./feature-bags";

type SelectionOptions = {
	selectionFeatures?: SelectionFeatures;
	spelledSelection?: string;
};

function buildSelectionFromSurface<L extends SupportedLanguage>(
	surface: Surface<L>,
	options: SelectionOptions = {},
): Selection<L> {
	return {
		language: surface.language,
		selectionFeatures: requireNonEmptyFeatureBag(
			options.selectionFeatures,
			"selectionFeatures",
		),
		spelledSelection:
			options.spelledSelection ?? surface.normalizedFullSurface,
		surface,
	} as unknown as Selection<L>;
}

export function buildConvertOperations<L extends SupportedLanguage>(
	_language: L,
	_parse: LanguageApi<L>["parse"],
): LanguageApi<L>["convert"] {
	return {
		lemma: {
			toSurface(lemma: Lemma<L>) {
				return {
					language: lemma.language,
					normalizedFullSurface: lemma.canonicalLemma,
					surfaceKind: "Citation",
					lemma,
				} as unknown as ReturnType<
					LanguageApi<L>["convert"]["lemma"]["toSurface"]
				>;
			},
			toSelection(lemma: Lemma<L>, options = {}) {
				return buildSelectionFromSurface(
					{
						language: lemma.language,
						normalizedFullSurface: lemma.canonicalLemma,
						surfaceKind: "Citation",
						lemma,
					} as unknown as Surface<L>,
					options,
				);
			},
		},
		surface: {
			toSelection(surface: Surface<L>, options = {}) {
				return buildSelectionFromSurface(surface, options);
			},
		},
	} as unknown as LanguageApi<L>["convert"];
}
