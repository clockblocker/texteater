import type { LanguageApi } from "../../../types/public-types";
import { requireNonEmptyFeatureBag } from "../../shared/feature-bags";

type HeCreateOperations = LanguageApi<"he">["create"];
type HeCreateLemma = HeCreateOperations["lemma"];
type HeCreateCitationSurface = HeCreateOperations["surface"]["citation"];
type HeCreateInflectionSurface = HeCreateOperations["surface"]["inflection"];
type HeCreateSelection = HeCreateOperations["selection"];

export function buildHeCreateOperations(): LanguageApi<"he">["create"] {
	const createLemma: HeCreateLemma = (input) =>
		({
			language: "he",
			canonicalLemma: input.canonicalLemma,
			lemmaKind: input.lemmaKind,
			lemmaSubKind: input.lemmaSubKind,
			inherentFeatures: input.inherentFeatures ?? {},
			meaningInEmojis: input.meaningInEmojis,
		}) as never;

	const createCitationSurface: HeCreateCitationSurface = (input) =>
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

	const createInflectionSurface: HeCreateInflectionSurface = (input) =>
		({
			language: input.lemma.language,
			normalizedFullSurface: input.normalizedFullSurface,
			surfaceKind: "Inflection",
			surfaceFeatures: requireNonEmptyFeatureBag(
				input.surfaceFeatures,
				"surfaceFeatures",
			),
			lemma: input.lemma,
			inflectionalFeatures: input.inflectionalFeatures,
		}) as never;

	const createSelection: HeCreateSelection = (input) =>
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
