import type { LanguageApi } from "../../../types/public-types";
import { requireNonEmptyFeatureBag } from "../../shared/feature-bags";

type EnCreateOperations = LanguageApi<"en">["create"];
type EnCreateLemma = EnCreateOperations["lemma"];
type EnCreateCitationSurface = EnCreateOperations["surface"]["citation"];
type EnCreateInflectionSurface = EnCreateOperations["surface"]["inflection"];
type EnCreateSelection = EnCreateOperations["selection"];

export function buildEnCreateOperations(): LanguageApi<"en">["create"] {
	const createLemma: EnCreateLemma = (input) =>
		({
			language: "en",
			canonicalLemma: input.canonicalLemma,
			lemmaKind: input.lemmaKind,
			lemmaSubKind: input.lemmaSubKind,
			inherentFeatures: input.inherentFeatures ?? {},
			meaningInEmojis: input.meaningInEmojis,
		}) as never;

	const createCitationSurface: EnCreateCitationSurface = (input) =>
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

	const createInflectionSurface: EnCreateInflectionSurface = (input) =>
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

	const createSelection: EnCreateSelection = (input) =>
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
