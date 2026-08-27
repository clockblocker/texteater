import { type Infer, v } from "convex/values";
import { getLanguageApi, toPresented } from "dumling";
import type {
	PresentedAttestation,
	PresentedFeatureSet,
	PresentedLemma,
	PresentedSurface,
} from "dumling/types";
import { presentedFeatureNames } from "dumling/vocabulary";

import {
	type attestationValueValidator,
	languageValidator,
	type lemmaValueValidator,
	orthographyValidator,
	realizationCoverageValidator,
	surfaceKindValidator,
	surfaceSpellingValidator,
	type surfaceValueValidator,
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
	family: v.string(),
	kind: v.string(),
	coreFeatures: presentedFeatureSetValidator,
});

export const presentedSurfaceValidator = v.object({
	language: languageValidator,
	normalizedSurface: v.string(),
	spelling: surfaceSpellingValidator,
	surfaceKind: surfaceKindValidator,
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

type LemmaValue = Infer<typeof lemmaValueValidator>;
type SurfaceValue = Infer<typeof surfaceValueValidator>;
type AttestationValue = Infer<typeof attestationValueValidator>;

export function presentLemma(
	value: LemmaValue,
): Infer<typeof presentedLemmaValidator> {
	const parsed = getLanguageApi(value.language).parse.lemma(value);
	if (!parsed.success) throw parsed.error;
	const presented = exactPresentedLemma(toPresented.lemma(parsed.data));
	assertCompletePresentedFeatureSet(presented.coreFeatures);
	return presented as unknown as Infer<typeof presentedLemmaValidator>;
}

export function presentSurface(
	value: SurfaceValue,
): Infer<typeof presentedSurfaceValidator> {
	const parsed = getLanguageApi(value.language).parse.surface(value);
	if (!parsed.success) throw parsed.error;
	const presented = exactPresentedSurface(toPresented.surface(parsed.data));
	assertCompletePresentedSurface(presented);
	return presented as unknown as Infer<typeof presentedSurfaceValidator>;
}

export function presentAttestation(
	value: AttestationValue,
): Infer<typeof presentedAttestationValidator> {
	const language = value.surface.language;
	const parsed = getLanguageApi(language).parse.attestation(value);
	if (!parsed.success) throw parsed.error;
	const projected = toPresented.attestation(parsed.data);
	const presented: PresentedAttestation = {
		...projected,
		surface: exactPresentedSurface(projected.surface),
	};
	assertCompletePresentedSurface(presented.surface);
	return presented as unknown as Infer<typeof presentedAttestationValidator>;
}

function exactPresentedSurface(surface: PresentedSurface): PresentedSurface {
	return {
		...surface,
		lemma: exactPresentedLemma(surface.lemma),
		inflectionalFeatures: exactPresentedFeatureSet(
			surface.inflectionalFeatures,
		),
	};
}

function exactPresentedLemma(lemma: PresentedLemma): PresentedLemma {
	return {
		...lemma,
		coreFeatures: exactPresentedFeatureSet(lemma.coreFeatures),
	};
}

function exactPresentedFeatureSet(
	features: Readonly<Record<string, unknown>>,
): PresentedFeatureSet {
	return Object.fromEntries(
		presentedFeatureNames.map((name) => [name, features[name] ?? null]),
	) as PresentedFeatureSet;
}

function assertCompletePresentedSurface(surface: PresentedSurface): void {
	assertCompletePresentedFeatureSet(surface.lemma.coreFeatures);
	assertCompletePresentedFeatureSet(surface.inflectionalFeatures);
}

function assertCompletePresentedFeatureSet(
	features: Readonly<Record<string, unknown>>,
): void {
	const names = Object.keys(features);
	if (
		names.length !== presentedFeatureNames.length ||
		presentedFeatureNames.some((name) => !Object.hasOwn(features, name))
	) {
		throw new Error(
			"Dumling returned an incomplete Presented feature set.",
		);
	}
}
