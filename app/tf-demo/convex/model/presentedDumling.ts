import { type Infer, v } from "convex/values";
import { checkIfGrundform, parseUnit } from "dumling";
import {
	familyValidator,
	grundformValidator,
	kindValidator,
	languageValidator,
	orthographyValidator,
	realizationCoverageValidator,
	surfaceSpellingValidator,
} from "./validators";

const presentedFeatureValueValidator = v.union(
	v.null(),
	v.string(),
	v.array(v.string()),
);

/** Convex records support bracketed Dumling feature names; objects do not. */
export const presentedFeatureSetValidator = v.record(
	v.string(),
	presentedFeatureValueValidator,
);

export const presentedLemmaValidator = v.object({
	language: languageValidator,
	canonicalForm: v.string(),
	family: familyValidator,
	kind: kindValidator,
	coreFeatures: presentedFeatureSetValidator,
});

export const presentedSurfaceValidator = v.object({
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	grundform: grundformValidator,
	surfaceFeatures: v.object({
		historicalStatus: v.union(v.null(), v.literal("Archaic")),
	}),
	lemma: presentedLemmaValidator,
	inflectionalFeatures: presentedFeatureSetValidator,
});

export const presentedAttestationValidator = v.object({
	members: v.array(
		v.object({
			attested: v.string(),
			orthography: orthographyValidator,
		}),
	),
	realizationCoverage: realizationCoverageValidator,
	surface: presentedSurfaceValidator,
});

export function presentLemma(
	value: unknown,
): Infer<typeof presentedLemmaValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Lemma" || parsed.chain.language === "en")
		throw new Error("Expected a Lemma.");
	const { language, family, kind, canonicalForm, coreFeatures } =
		parsed.chain.value;
	return {
		language,
		family,
		kind,
		canonicalForm,
		coreFeatures: coreFeatures ?? {},
	};
}
export function presentSurface(
	value: unknown,
): Infer<typeof presentedSurfaceValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Surface" || parsed.chain.language === "en")
		throw new Error("Expected a Surface.");
	const surface = parsed.chain.value;
	const assessment = checkIfGrundform(surface);
	return {
		language: surface.language,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		grundform: assessment.success ? assessment.value : null,
		surfaceFeatures: {
			historicalStatus: surface.surfaceFeatures?.historicalStatus ?? null,
		},
		inflectionalFeatures:
			"inflectionalFeatures" in surface
				? (surface.inflectionalFeatures ?? {})
				: {},
		lemma: presentLemma(surface.lemma),
	};
}
export function presentAttestation(
	value: unknown,
): Infer<typeof presentedAttestationValidator> {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Attestation")
		throw new Error("Expected an Attestation.");
	const attestation = parsed.chain.value;
	return {
		members: attestation.members.map((member) => ({ ...member })),
		realizationCoverage: attestation.realizationCoverage,
		surface: presentSurface(attestation.surface),
	};
}
