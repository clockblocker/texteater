import type { LanguageApi } from "../../../types/public-types";
import { requireNonEmptyFeatureBag } from "../../shared/feature-bags";

type DeCreateOperations = LanguageApi<"de">["create"];
type DeCreateLemma = DeCreateOperations["lemma"];
type DeCreateCitationSurface = DeCreateOperations["surface"]["citation"];
type DeCreateInflectionSurface = DeCreateOperations["surface"]["inflection"];
type DeCreateSelection = DeCreateOperations["selection"];

export function buildDeCreateOperations(): LanguageApi<"de">["create"] {
	const createLemma: DeCreateLemma = (input) =>
		({
			language: "de",
			canonicalLemma: input.canonicalLemma,
			lemmaKind: input.lemmaKind,
			lemmaSubKind: input.lemmaSubKind,
			inherentFeatures: input.inherentFeatures ?? {},
			meaningInEmojis: input.meaningInEmojis,
		}) as never;

	const createCitationSurface: DeCreateCitationSurface = (input) =>
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

	const createInflectionSurface: DeCreateInflectionSurface = (input) =>
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

	const createSelection: DeCreateSelection = (input) =>
		({
			language: input.surface.language,
			selectionFeatures: requireNonEmptyFeatureBag(
				input.selectionFeatures,
				"selectionFeatures",
			),
			spelledSelection: input.spelledSelection,
			surface: input.surface,
		}) as never;

	const operations = {
		lemma: createLemma,
		surface: {
			citation: createCitationSurface,
			inflection: createInflectionSurface,
		},
		selection: createSelection,
	};

	return operations;
}
