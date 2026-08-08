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
): Attestation<L> {
	return {
		...options,
		surface,
	} as unknown as Attestation<L>;
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
					surfaceKind: "Citation",
					surfaceFeatures: null,
					lemma,
				} as unknown as ReturnType<
					LanguageApi<L>["convert"]["lemma"]["toSurface"]
				>;
			},
			toAttestation(lemma: Lemma<L>, options: AttestationOptionsFor) {
				return buildAttestationFromSurface(
					{
						language: lemma.language,
						normalizedSurface: lemma.canonicalForm,
						spelling: "Canonical",
						surfaceKind: "Citation",
						surfaceFeatures: null,
						lemma,
					} as unknown as Surface<L>,
					options,
				);
			},
		},
		surface: {
			toAttestation(surface: Surface<L>, options: AttestationOptionsFor) {
				return buildAttestationFromSurface(surface, options);
			},
		},
	} as unknown as LanguageApi<L>["convert"];
}
