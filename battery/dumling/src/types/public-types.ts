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
import type {
	LanguageAttestationByKindMap,
	LanguageLemmaUnionMap,
	LanguageSurfaceUnionMap,
	SurfaceByKindForLanguage,
} from "./concrete-language/concrete-language-types.js";
import type {
	ConcreteLanguage,
	LanguagePackFeatureRegistry,
} from "./concrete-language/features/feature-registry.js";
import type {
	LemmaFamily as CoreLemmaFamily,
	LemmaKind as CoreLemmaKind,
	SupportedLanguage as CoreSupportedLanguage,
	SurfaceKind as CoreSurfaceKind,
} from "./core/enums.js";
import type { PrettifyDeep } from "./core/helpers.js";

export type SupportedLanguage = CoreSupportedLanguage;
export type Language = SupportedLanguage;
export type LemmaFamily = CoreLemmaFamily;
export type LemmaKind = CoreLemmaKind;
export type SurfaceKind = CoreSurfaceKind;
export type AttestationMember = AbstractAttestationMember;
export type SurfaceFeatures = AbstractSurfaceFeatures;
export type EntityKind = "Lemma" | "Surface" | "Attestation";
export type EntityValue<L extends SupportedLanguage = SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Attestation<L>;

export type EntityForKind<
	L extends SupportedLanguage,
	K extends EntityKind,
> = K extends "Lemma"
	? Lemma<L>
	: K extends "Surface"
		? Surface<L>
		: Attestation<L>;

export type DumlingCsv<L extends SupportedLanguage = SupportedLanguage> =
	string & {
		readonly __dumlingCsvBrand: {
			readonly language: L;
		};
	};

export type DumlingDescriptorCsv<
	L extends SupportedLanguage = SupportedLanguage,
	K extends EntityKind = EntityKind,
> = string & {
	readonly __dumlingDescriptorCsvBrand: {
		readonly language: L;
		readonly entityKind: K;
	};
};

export type DumlingBase64Url<L extends SupportedLanguage = SupportedLanguage> =
	string & {
		readonly __dumlingBase64UrlBrand: {
			readonly language: L;
		};
	};

export type LemmaFamilyFor<L extends SupportedLanguage> =
	L extends ConcreteLanguage
		? Extract<keyof LanguagePackFeatureRegistry[L], LemmaFamily>
		: LemmaFamily;

export type LemmaKindFor<
	L extends SupportedLanguage,
	LK extends string,
> = L extends ConcreteLanguage
	? LK extends LemmaFamilyFor<L>
		? Extract<
				keyof LanguagePackFeatureRegistry[L][LK],
				AbstractLemmaKindFor<LK & LemmaFamily>
			>
		: never
	: LK extends LemmaFamily
		? AbstractLemmaKindFor<LK>
		: never;

export type SurfaceKindFor<L extends SupportedLanguage> =
	L extends ConcreteLanguage
		? Extract<keyof SurfaceByKindForLanguage<L>, SurfaceKind>
		: SurfaceKind;

export type LemmaFamilyForSurfaceKind<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
> = L extends ConcreteLanguage
	? SK extends keyof SurfaceByKindForLanguage<L>
		? Extract<keyof SurfaceByKindForLanguage<L>[SK], LemmaFamilyFor<L>>
		: never
	: LemmaFamilyFor<L>;

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

export type Lemma<
	L extends SupportedLanguage = SupportedLanguage,
	LK extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK> = LemmaKindFor<L, LK>,
> = L extends ConcreteLanguage
	? ConcreteLemmaFor<
			L & ConcreteLanguage,
			LK & LemmaFamilyFor<L & ConcreteLanguage>,
			LSK &
				LemmaKindFor<
					L & ConcreteLanguage,
					LK & LemmaFamilyFor<L & ConcreteLanguage>
				>
		>
	: PlaceholderLemma<L, LK, LSK>;

/**
 * A Surface is the persistent normalized learner-facing grammatical form.
 *
 * `surfaceKind: "Citation"` means the surface is stored in citation / Grundform shape.
 * Example: German `Mutter` stays `Citation`.
 *
 * `surfaceKind: "Inflection"` means the surface is stored as an inflected form with inflectional features.
 * Example: German `Kindern` is `Inflection`.
 */
export type Surface<
	L extends SupportedLanguage = SupportedLanguage,
	SK extends SurfaceKindFor<L> = SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK> = LemmaFamilyForSurfaceKind<
		L,
		SK
	>,
	LSK extends LemmaKindFor<L, LK> = LemmaKindFor<L, LK>,
> = L extends ConcreteLanguage
	? ConcreteSurfaceFor<
			L & ConcreteLanguage,
			SK & SurfaceKindFor<L & ConcreteLanguage>,
			LK &
				LemmaFamilyForSurfaceKind<
					L & ConcreteLanguage,
					SK & SurfaceKindFor<L & ConcreteLanguage>
				>,
			LSK &
				LemmaKindFor<
					L & ConcreteLanguage,
					LK &
						LemmaFamilyForSurfaceKind<
							L & ConcreteLanguage,
							SK & SurfaceKindFor<L & ConcreteLanguage>
						>
				>
		>
	: PlaceholderSurface<L, SK, LK, LSK>;

/**
 * An Attestation is fleeting, click-independent occurrence evidence linked to
 * one persistent Surface. Members preserve source order and carry their own
 * orthography evidence. Attestations have no identity or ID codec.
 */
export type Attestation<
	L extends SupportedLanguage = SupportedLanguage,
	SK extends SurfaceKindFor<L> = SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK> = LemmaFamilyForSurfaceKind<
		L,
		SK
	>,
	LSK extends LemmaKindFor<L, LK> = LemmaKindFor<L, LK>,
> = L extends ConcreteLanguage
	? ConcreteAttestationFor<
			L & ConcreteLanguage,
			SK & SurfaceKindFor<L & ConcreteLanguage>,
			LK &
				LemmaFamilyForSurfaceKind<
					L & ConcreteLanguage,
					SK & SurfaceKindFor<L & ConcreteLanguage>
				>,
			LSK &
				LemmaKindFor<
					L & ConcreteLanguage,
					LK &
						LemmaFamilyForSurfaceKind<
							L & ConcreteLanguage,
							SK & SurfaceKindFor<L & ConcreteLanguage>
						>
				>
		>
	: PlaceholderAttestation<L, SK, LK, LSK>;

/**
 * A Reading is the semantic identity formed by one Lemma and one normalized
 * emoji description. Host persistence IDs and learner note content are not
 * part of this value.
 */
export type Reading<
	L extends SupportedLanguage = SupportedLanguage,
	LK extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK> = LemmaKindFor<L, LK>,
> = {
	lemma: Lemma<L, LK, LSK>;
	emojiDescription: string;
};

declare const readingFingerprintBrand: unique symbol;

/**
 * Stable structural identity for a Reading. The serialized format is a public
 * compatibility contract suitable for equality and indexed host lookup.
 */
export type ReadingFingerprint = string & {
	readonly [readingFingerprintBrand]: "Reading";
};

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

export type CoreFeaturesFor<
	L extends SupportedLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = FeatureSet<L, "core", LK, LSK>;

export type InflectionalFeaturesFor<
	L extends SupportedLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = FeatureSet<L, "inflectional", LK, LSK>;

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

export type LemmaIdentity<L extends SupportedLanguage = SupportedLanguage> =
	Lemma<L>;

export type SurfaceIdentity<L extends SupportedLanguage = SupportedLanguage> = {
	language: L;
	normalizedSurface: string;
	surfaceKind: SurfaceKindFor<L>;
	lemma: LemmaIdentity<L>;
	inflectionalFeatures?: Record<string, unknown>;
};

export type {
	AbstractAttestation,
	AbstractCoreFeaturesFor,
	AbstractInflectionalFeaturesFor,
	AbstractLemma,
	AbstractLemmaKindFor,
	AbstractSurface,
};

type PlaceholderLemma<
	L extends SupportedLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = AbstractLemma<
	L,
	LK & LemmaFamily,
	LSK & AbstractLemmaKindFor<LK & LemmaFamily>
>;

type ConcreteLemmaFor<
	L extends ConcreteLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = Extract<LanguageLemmaUnionMap[L], { family: LK; kind: LSK }>;

type PlaceholderSurface<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
	LSK extends LemmaKindFor<L, LK>,
> = {
	language: L;
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	surfaceKind: SK;
	surfaceFeatures: SurfaceFeatures | null;
	lemma: Lemma<L, LK, LSK>;
} & (SK extends "Inflection"
	? {
			inflectionalFeatures: AbstractInflectionalFeaturesFor<
				LK & LemmaFamily,
				LSK & AbstractLemmaKindFor<LK & LemmaFamily>
			>;
		}
	: Record<never, never>);

type ConcreteSurfaceFor<
	L extends ConcreteLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
	LSK extends LemmaKindFor<L, LK>,
> = LanguageSurfaceUnionMap[L] extends infer TSurface
	? TSurface extends {
			surfaceKind: SK;
			lemma: { family: LK; kind: LSK };
		}
		? TSurface
		: never
	: never;

type PlaceholderAttestation<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
	LSK extends LemmaKindFor<L, LK>,
> = {
	members: readonly [AttestationMember, ...AttestationMember[]];
	realizationCoverage: "Full" | "Partial";
	surface: Surface<L, SK, LK, LSK>;
};

type ConcreteAttestationFor<
	L extends ConcreteLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
	LSK extends LemmaKindFor<L, LK>,
> = SK extends keyof LanguageAttestationByKindMap[L]
	? LK extends keyof LanguageAttestationByKindMap[L][SK]
		? LSK extends keyof LanguageAttestationByKindMap[L][SK][LK]
			? LanguageAttestationByKindMap[L][SK][LK][LSK]
			: never
		: never
	: never;
