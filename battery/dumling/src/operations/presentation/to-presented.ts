import type {
	Attestation,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	PresentedAttestation,
	PresentedFeatureSet,
	PresentedLemma,
	PresentedSurface,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "../../types/public-types.js";
import { presentedFeatureNames } from "./presented-feature-names.js";

const emptyPresentedFeatureSet = Object.freeze(
	Object.fromEntries(presentedFeatureNames.map((name) => [name, null])),
) as Readonly<PresentedFeatureSet>;

function totalizeFeatureSet(
	features: Readonly<Record<string, unknown>> | undefined,
): PresentedFeatureSet {
	const result: Record<string, unknown> = {
		...emptyPresentedFeatureSet,
		...features,
	};
	for (const name of presentedFeatureNames) {
		const value = result[name];
		if (Array.isArray(value)) {
			result[name] = [...value];
		}
	}
	return result as PresentedFeatureSet;
}

export function toPresentedLemma<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(lemma: Lemma<L, F, K>): PresentedLemma<L, F, K> {
	return {
		...lemma,
		coreFeatures: totalizeFeatureSet(lemma.coreFeatures),
	} as PresentedLemma<L, F, K>;
}

export function toPresentedSurface<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(surface: Surface<L, SK, F, K>): PresentedSurface<L, SK, F, K> {
	const inflectionalFeatures =
		"inflectionalFeatures" in surface
			? (surface.inflectionalFeatures as Readonly<
					Record<string, unknown>
				>)
			: undefined;

	return {
		...surface,
		surfaceFeatures: {
			historicalStatus: null,
			...(surface.surfaceFeatures ?? {}),
		},
		lemma: toPresentedLemma<L, F, K>(
			surface.lemma as unknown as Lemma<L, F, K>,
		),
		inflectionalFeatures: totalizeFeatureSet(inflectionalFeatures),
	} as PresentedSurface<L, SK, F, K>;
}

export function toPresentedAttestation<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(attestation: Attestation<L, SK, F, K>): PresentedAttestation<L, SK, F, K> {
	return {
		...attestation,
		members: attestation.members.map((member) => ({ ...member })) as [
			(typeof attestation.members)[number],
			...(typeof attestation.members)[number][],
		],
		surface: toPresentedSurface<L, SK, F, K>(
			attestation.surface as unknown as Surface<L, SK, F, K>,
		),
	};
}

export const toPresented = {
	surface: toPresentedSurface,
	lemma: toPresentedLemma,
	attestation: toPresentedAttestation,
} as const;
