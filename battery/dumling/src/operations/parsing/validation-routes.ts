import type {
	Attestation,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	LemmaKindForSurfaceKind,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "../../types/public-types.js";

interface DumlingValidationRoute<Key extends string, Input, Output> {
	readonly key: Key;
	readonly "~input"?: Input;
	readonly "~output"?: Output;
}

type LemmaValidationRoutes = {
	[Language in SupportedLanguage]: {
		[Family in LemmaFamilyFor<Language>]: {
			[Kind in LemmaKindFor<Language, Family>]: DumlingValidationRoute<
				`Lemma:${Language}/${Family}/${Kind}`,
				unknown,
				Lemma<Language, Family, Kind>
			>;
		}[LemmaKindFor<Language, Family>];
	}[LemmaFamilyFor<Language>];
}[SupportedLanguage];

type ReadingValidationRoutes = {
	[Language in SupportedLanguage]: {
		[Family in LemmaFamilyFor<Language>]: {
			[Kind in LemmaKindFor<Language, Family>]: DumlingValidationRoute<
				`Reading:${Language}/${Family}/${Kind}`,
				unknown,
				Reading<Language, Family, Kind>
			>;
		}[LemmaKindFor<Language, Family>];
	}[LemmaFamilyFor<Language>];
}[SupportedLanguage];

type SurfaceValidationRoutes = {
	[Language in SupportedLanguage]: {
		[SurfaceKind in SurfaceKindFor<Language>]: {
			[Family in LemmaFamilyForSurfaceKind<Language, SurfaceKind>]: {
				[Kind in LemmaKindForSurfaceKind<
					Language,
					SurfaceKind,
					Family
				>]: DumlingValidationRoute<
					`Surface:${Language}/${SurfaceKind}/${Family}/${Kind}`,
					unknown,
					Surface<Language, SurfaceKind, Family, Kind>
				>;
			}[LemmaKindForSurfaceKind<Language, SurfaceKind, Family>];
		}[LemmaFamilyForSurfaceKind<Language, SurfaceKind>];
	}[SurfaceKindFor<Language>];
}[SupportedLanguage];

type AttestationValidationRoutes = {
	[Language in SupportedLanguage]: {
		[SurfaceKind in SurfaceKindFor<Language>]: {
			[Family in LemmaFamilyForSurfaceKind<Language, SurfaceKind>]: {
				[Kind in LemmaKindForSurfaceKind<
					Language,
					SurfaceKind,
					Family
				>]: DumlingValidationRoute<
					`Attestation:${Language}/${SurfaceKind}/${Family}/${Kind}`,
					unknown,
					Attestation<Language, SurfaceKind, Family, Kind>
				>;
			}[LemmaKindForSurfaceKind<Language, SurfaceKind, Family>];
		}[LemmaFamilyForSurfaceKind<Language, SurfaceKind>];
	}[SurfaceKindFor<Language>];
}[SupportedLanguage];

type CanonicalDumlingValidationRoute =
	| AttestationValidationRoutes
	| LemmaValidationRoutes
	| ReadingValidationRoutes
	| SurfaceValidationRoutes;

export type CanonicalDumlingValidationRouteKey =
	CanonicalDumlingValidationRoute["key"];

type CanonicalDumlingValidationRouteFor<
	Key extends CanonicalDumlingValidationRouteKey,
> = Extract<CanonicalDumlingValidationRoute, { key: Key }>;

type DumlingValidationRouteInput<Route> =
	Route extends DumlingValidationRoute<string, infer Input, unknown>
		? Input
		: never;

export type DumlingValidationRouteOutput<Route> =
	Route extends DumlingValidationRoute<string, unknown, infer Output>
		? Output
		: never;

export type CanonicalDumlingValidationRouteOutput<
	Key extends CanonicalDumlingValidationRouteKey,
> = DumlingValidationRouteOutput<CanonicalDumlingValidationRouteFor<Key>>;

export type OperationalDumlingValidationRoute<
	Key extends CanonicalDumlingValidationRouteKey,
> = DumlingValidationRoute<
	Key,
	DumlingValidationRouteInput<CanonicalDumlingValidationRouteFor<Key>>,
	CanonicalDumlingValidationRouteOutput<Key>
> & {
	readonly canonical: true;
};

export function lemmaValidationRoute<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(
	language: L,
	family: F,
	kind: K,
): OperationalDumlingValidationRoute<
	Extract<`Lemma:${L}/${F}/${K}`, CanonicalDumlingValidationRouteKey>
> {
	return canonicalRoute(
		`Lemma:${language}/${family}/${kind}` as Extract<
			`Lemma:${L}/${F}/${K}`,
			CanonicalDumlingValidationRouteKey
		>,
	);
}

export function surfaceValidationRoute<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindForSurfaceKind<L, SK, F>,
>(
	language: L,
	surfaceKind: SK,
	family: F,
	kind: K,
): OperationalDumlingValidationRoute<
	Extract<`Surface:${L}/${SK}/${F}/${K}`, CanonicalDumlingValidationRouteKey>
> {
	return canonicalRoute(
		`Surface:${language}/${surfaceKind}/${family}/${kind}` as Extract<
			`Surface:${L}/${SK}/${F}/${K}`,
			CanonicalDumlingValidationRouteKey
		>,
	);
}

export function attestationValidationRoute<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindForSurfaceKind<L, SK, F>,
>(
	language: L,
	surfaceKind: SK,
	family: F,
	kind: K,
): OperationalDumlingValidationRoute<
	Extract<
		`Attestation:${L}/${SK}/${F}/${K}`,
		CanonicalDumlingValidationRouteKey
	>
> {
	return canonicalRoute(
		`Attestation:${language}/${surfaceKind}/${family}/${kind}` as Extract<
			`Attestation:${L}/${SK}/${F}/${K}`,
			CanonicalDumlingValidationRouteKey
		>,
	);
}

export function readingValidationRoute<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(
	language: L,
	family: F,
	kind: K,
): OperationalDumlingValidationRoute<
	Extract<`Reading:${L}/${F}/${K}`, CanonicalDumlingValidationRouteKey>
> {
	return canonicalRoute(
		`Reading:${language}/${family}/${kind}` as Extract<
			`Reading:${L}/${F}/${K}`,
			CanonicalDumlingValidationRouteKey
		>,
	);
}

function canonicalRoute<Key extends CanonicalDumlingValidationRouteKey>(
	key: Key,
): OperationalDumlingValidationRoute<Key> {
	return { canonical: true, key } as OperationalDumlingValidationRoute<Key>;
}

export type CompatibilityDumlingValidationRoute<Output> =
	DumlingValidationRoute<string, unknown, Output> & {
		readonly compatibility: true;
	};

export function compatibilityLemmaValidationRoute<L extends SupportedLanguage>(
	language: L,
	family: string,
	kind: string,
): CompatibilityDumlingValidationRoute<Lemma<L>> {
	return compatibilityRoute(`Lemma:${language}/${family}/${kind}`);
}

export function compatibilitySurfaceValidationRoute<
	L extends SupportedLanguage,
>(
	language: L,
	surfaceKind: string,
	family: string,
	kind: string,
): CompatibilityDumlingValidationRoute<Surface<L>> {
	return compatibilityRoute(
		`Surface:${language}/${surfaceKind}/${family}/${kind}`,
	);
}

export function compatibilityAttestationValidationRoute<
	L extends SupportedLanguage,
>(
	language: L,
	surfaceKind: string,
	family: string,
	kind: string,
): CompatibilityDumlingValidationRoute<Attestation<L>> {
	return compatibilityRoute(
		`Attestation:${language}/${surfaceKind}/${family}/${kind}`,
	);
}

function compatibilityRoute<Output>(
	key: string,
): CompatibilityDumlingValidationRoute<Output> {
	return { compatibility: true, key } as const;
}
