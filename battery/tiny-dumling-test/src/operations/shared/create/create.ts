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

	const createAttestation: CreateOperations["attestation"] = (input) => {
		if (
			input.members.length === 0 ||
			input.members.some(
				(member) =>
					member.attested.length === 0 ||
					(member.orthography !== "Standard" &&
						member.orthography !== "Typo"),
			)
		) {
			throw new Error(
				"Attestation members must be non-empty paired text and orthography evidence",
			);
		}
		if (
			input.realizationCoverage !== "Full" &&
			input.realizationCoverage !== "Partial"
		) {
			throw new Error(
				"Attestation realization coverage must be Full or Partial",
			);
		}

		return {
			members: input.members,
			realizationCoverage: input.realizationCoverage,
			surface: input.surface,
		} as never;
	};

	return {
		attestation: createAttestation,
		lemma: createLemma,
		surface: {
			citation: createCitationSurface,
			inflection: createInflectionSurface,
		},
	};
}
