import type {
	Attestation,
	AttestationOptionsFor,
	Lemma,
	SupportedLanguage,
	Surface,
} from "../../../types/public-types.js";
import type { LanguageApi } from "../../api-shape.js";

function buildAttestationFromSurface<L extends SupportedLanguage>(
	surface: Surface<L>,
	options: AttestationOptionsFor,
	createAttestation: LanguageApi<L>["create"]["attestation"],
): Attestation<L> {
	return createAttestation({
		members: options.members,
		realizationCoverage: options.realizationCoverage,
		surface,
	} as Attestation<L>);
}

export function buildConvertOperations<L extends SupportedLanguage>(
	createAttestation: LanguageApi<L>["create"]["attestation"],
): LanguageApi<L>["convert"] {
	return {
		lemma: {
			toSurface(lemma: Lemma<L>) {
				return {
					language: lemma.language,
					normalizedSurface: lemma.canonicalForm,
					spelling: "Canonical",
					surfaceKind: "Citation",
					surfaceFeatures: null,
					lemma,
				} as unknown as ReturnType<
					LanguageApi<L>["convert"]["lemma"]["toSurface"]
				>;
			},
		},
		surface: {
			toAttestation(surface: Surface<L>, options: AttestationOptionsFor) {
				return buildAttestationFromSurface(
					surface,
					options,
					createAttestation,
				);
			},
		},
	} as unknown as LanguageApi<L>["convert"];
}
