import type { SupportedLanguage } from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";
import { requireNonEmptyFeatureBag } from "../feature-bags.js";

export function buildCreateOperations<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["create"] {
	type CreateOperations = LanguageApi<L>["create"];

	const createLemma: CreateOperations["lemma"] = (input) =>
		({
			language,
			canonicalLemma: input.canonicalLemma,
			lemmaKind: input.lemmaKind,
			lemmaSubKind: input.lemmaSubKind,
			inherentFeatures: input.inherentFeatures ?? {},
			meaningInEmojis: input.meaningInEmojis,
		}) as never;

	const createCitationSurface: CreateOperations["surface"]["citation"] = (
		input,
	) =>
		({
			language: input.lemma.language,
			normalizedFullSurface: input.normalizedFullSurface,
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
			normalizedFullSurface: input.normalizedFullSurface,
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

	const createSelection: CreateOperations["selection"] = (input) =>
		({
			language: input.surface.language,
			selectionFeatures: requireNonEmptyFeatureBag(
				input.selectionFeatures,
				"selectionFeatures",
			),
			spelledSelection: input.spelledSelection,
			surface: input.surface,
		}) as never;

	return {
		lemma: createLemma,
		surface: {
			citation: createCitationSurface,
			inflection: createInflectionSurface,
		},
		selection: createSelection,
	};
}
