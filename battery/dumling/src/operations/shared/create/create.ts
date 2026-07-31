import type { SupportedLanguage } from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";
import { requireNonEmptyFeatureBag } from "../feature-bags.js";

function requireOpaqueId(value: string, name: string): string {
	if (
		value.length === 0 ||
		value.trim() !== value ||
		value.normalize("NFC") !== value
	) {
		throw new Error(`${name} must be a non-empty normalized string`);
	}
	return value;
}

function requireSelectionIndices(
	clickedSegmentIndex: number,
	surfaceSegmentIndices: number[],
) {
	if (!Number.isInteger(clickedSegmentIndex) || clickedSegmentIndex < 0) {
		throw new Error("clickedSegmentIndex must be a non-negative integer");
	}
	if (
		surfaceSegmentIndices.length === 0 ||
		!surfaceSegmentIndices.includes(clickedSegmentIndex) ||
		surfaceSegmentIndices.some(
			(index, position) =>
				!Number.isInteger(index) ||
				index < 0 ||
				(position > 0 &&
					index <= (surfaceSegmentIndices[position - 1] ?? -1)),
		)
	) {
		throw new Error(
			"surfaceSegmentIndices must be ordered, unique, non-negative, and include clickedSegmentIndex",
		);
	}
}

export function buildCreateOperations<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["create"] {
	type CreateOperations = LanguageApi<L>["create"];

	const createLemma: CreateOperations["lemma"] = (input) =>
		({
			language,
			canonicalForm: input.canonicalForm,
			family: input.family,
			kind: input.kind,
			coreFeatures: input.coreFeatures ?? {},
		}) as never;

	const createCitationSurface: CreateOperations["surface"]["citation"] = (
		input,
	) =>
		({
			language: input.lemma.language,
			normalizedSurface: input.normalizedSurface,
			spelling: input.spelling,
			realizationCoverage: input.realizationCoverage,
			surfaceKind: "Citation",
			surfaceFeatures: requireNonEmptyFeatureBag(
				input.surfaceFeatures,
				"surfaceFeatures",
			),
			lemma: input.lemma,
		}) as never;

	const createInflectionSurface: CreateOperations["surface"]["inflection"] = (
		input,
	) =>
		({
			language: input.lemma.language,
			normalizedSurface: input.normalizedSurface,
			spelling: input.spelling,
			realizationCoverage: input.realizationCoverage,
			surfaceKind: "Inflection",
			surfaceFeatures: requireNonEmptyFeatureBag(
				input.surfaceFeatures,
				"surfaceFeatures",
			),
			lemma: input.lemma,
			inflectionalFeatures: (
				input as typeof input & { inflectionalFeatures: unknown }
			).inflectionalFeatures,
		}) as never;

	const createSelection: CreateOperations["selection"] = (input) => {
		requireOpaqueId(input.segmentedSentenceId, "SegmentedSentenceId");
		requireSelectionIndices(
			input.clickedSegmentIndex,
			input.surfaceSegmentIndices,
		);
		return {
			segmentedSentenceId: input.segmentedSentenceId,
			clickedSegmentIndex: input.clickedSegmentIndex,
			surfaceSegmentIndices: input.surfaceSegmentIndices,
			attestedSurface: input.attestedSurface,
			selectedOrthography: input.selectedOrthography,
			surface: input.surface,
		} as never;
	};

	return {
		segmentedSentenceId(input) {
			return requireOpaqueId(input, "SegmentedSentenceId") as never;
		},
		lemma: createLemma,
		surface: {
			citation: createCitationSurface,
			inflection: createInflectionSurface,
		},
		selection: createSelection,
	};
}
