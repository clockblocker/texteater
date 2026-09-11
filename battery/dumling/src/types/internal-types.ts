import type { Brand, PrettifyDeep } from "common-utils";
import type {
	AbstractAttestation,
	AttestationMember as AbstractAttestationMember,
	AbstractCoreFeaturesFor,
	AbstractInflectionalFeaturesFor,
	AbstractLemma,
	AbstractLemmaKindFor,
	AbstractSurface,
	SurfaceFeatures as AbstractSurfaceFeatures,
} from "./abstract/entities.js";
import type {
	AbstractFeatureName,
	AbstractFeatureValue as AbstractFeatureValueForName,
} from "./abstract/features/features-catalog.js";
import type { SurfaceByKindForLanguage } from "./concrete-language/concrete-language-types.js";
import type {
	ConcreteLanguage,
	LanguagePackFeatureRegistry,
} from "./concrete-language/features/feature-registry.js";
import type {
	LemmaFamily as CoreLemmaFamily,
	LemmaKind as CoreLemmaKind,
	SurfaceKind as CoreSurfaceKind,
} from "./core/enums.js";
import type {
	Attestation,
	EntityKind,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	LemmaRoute,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "./public-types.js";

export type LemmaFamily = CoreLemmaFamily;
export type LemmaKind = CoreLemmaKind;
export type SurfaceKind = CoreSurfaceKind;
export type AttestationMember = AbstractAttestationMember;
export type SurfaceFeatures = AbstractSurfaceFeatures;

export type EntityForKind<
	L extends SupportedLanguage,
	K extends EntityKind,
> = K extends "Lemma"
	? Lemma<L>
	: K extends "Surface"
		? Surface<L>
		: Attestation<L>;

export type DumlingDescriptorCsv<
	L extends SupportedLanguage = SupportedLanguage,
	K extends EntityKind = EntityKind,
> = Brand<
	string,
	{
		readonly entityKind: K;
		readonly format: "DumlingDescriptorCsv";
		readonly language: L;
	}
>;

export type DumlingBase64Url<L extends SupportedLanguage = SupportedLanguage> =
	Brand<
		string,
		{ readonly format: "DumlingBase64Url"; readonly language: L }
	>;

export type LemmaKindForSurfaceKind<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
> = L extends ConcreteLanguage
	? SK extends keyof SurfaceByKindForLanguage<L>
		? LK extends keyof SurfaceByKindForLanguage<L>[SK]
			? Extract<
					keyof SurfaceByKindForLanguage<L>[SK][LK],
					LemmaKindFor<L, LK>
				>
			: never
		: never
	: LemmaKindFor<L, LK>;

/** The exact ordinary Lemma value selected by a production route. */
export type LemmaForRoute<R extends LemmaRoute> =
	R extends Readonly<{
		language: infer L;
		family: infer F;
		kind: infer K;
	}>
		? L extends SupportedLanguage
			? F extends LemmaFamilyFor<L>
				? K extends LemmaKindFor<L, F>
					? Lemma<L, F, K>
					: never
				: never
			: never
		: never;

/**
 * Stable structural identity for a Reading. The serialized format is a public
 * compatibility contract suitable for equality and indexed host lookup.
 */
export type ReadingFingerprint = Brand<string, "ReadingFingerprint">;

export type FeatureSetKind = "core" | "inflectional";

type PrettifyFeatureSet<T> = T extends object
	? {
			[K in keyof T as K extends string ? `${K}` : K]: PrettifyDeep<T[K]>;
		} & {}
	: never;

export type FeatureSet<
	L extends SupportedLanguage,
	K extends FeatureSetKind,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = PrettifyFeatureSet<
	L extends ConcreteLanguage
		? LK extends keyof LanguagePackFeatureRegistry[L]
			? LSK extends keyof LanguagePackFeatureRegistry[L][LK]
				? LanguagePackFeatureRegistry[L][LK][LSK] extends infer TFeatureDefinition extends
						{
							inflectional: Record<string, unknown>;
							core: Record<string, unknown>;
						}
					? TFeatureDefinition[K]
					: never
				: never
			: never
		: K extends "core"
			? AbstractCoreFeaturesFor<
					LK & LemmaFamily,
					LSK & AbstractLemmaKindFor<LK & LemmaFamily>
				>
			: AbstractInflectionalFeaturesFor<
					LK & LemmaFamily,
					LSK & AbstractLemmaKindFor<LK & LemmaFamily>
				>
>;

export type AbstractFeatureValue<F extends AbstractFeatureName> =
	AbstractFeatureValueForName<F>;

export type FeatureName<
	L extends SupportedLanguage,
	K extends FeatureSetKind,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = Extract<
	FeatureSet<L, K, LK, LSK> extends infer TFeatureSet
		? TFeatureSet extends unknown
			? keyof TFeatureSet
			: never
		: never,
	AbstractFeatureName
>;

export type FeatureValue<
	L extends SupportedLanguage,
	K extends FeatureSetKind,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
	F extends FeatureName<L, K, LK, LSK>,
> =
	FeatureSet<L, K, LK, LSK> extends infer TFeatureSet
		? TFeatureSet extends unknown
			? F extends keyof TFeatureSet
				? TFeatureSet[F]
				: never
			: never
		: never;

export type AttestationOptionsFor = {
	members: readonly [AttestationMember, ...AttestationMember[]];
	realizationCoverage: "Full" | "Partial";
};

export type {
	AbstractAttestation,
	AbstractCoreFeaturesFor,
	AbstractInflectionalFeaturesFor,
	AbstractLemma,
	AbstractLemmaKindFor,
	AbstractSurface,
};
