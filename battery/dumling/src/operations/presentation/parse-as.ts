import type {
	Attestation,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "../../types/public-types.js";
import {
	type ParsingError,
	parsePresentedDumlingRoute,
} from "../parsing/lightweight-parsers.js";
import {
	attestationValidationRoute,
	lemmaValidationRoute,
	surfaceValidationRoute,
} from "../parsing/validation-routes.js";

type Parsed<Output> = Output | ParsingError<Output>;

function parsePresentedAsLemma<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	family: F & LemmaFamilyFor<NoInfer<L>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Lemma<L, F, K>> {
	return parsePresentedDumlingRoute(
		input,
		lemmaValidationRoute(language, family, kind),
	) as Parsed<Lemma<L, F, K>>;
}

function parsePresentedAsSurface<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	surfaceKind: SK & SurfaceKindFor<NoInfer<L>>,
	family: F & LemmaFamilyForSurfaceKind<NoInfer<L>, NoInfer<SK>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Surface<L, SK, F, K>> {
	return parsePresentedDumlingRoute(
		input,
		surfaceValidationRoute(language, surfaceKind, family, kind as never),
	) as Parsed<Surface<L, SK, F, K>>;
}

function parsePresentedAsAttestation<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	surfaceKind: SK & SurfaceKindFor<NoInfer<L>>,
	family: F & LemmaFamilyForSurfaceKind<NoInfer<L>, NoInfer<SK>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Attestation<L, SK, F, K>> {
	return parsePresentedDumlingRoute(
		input,
		attestationValidationRoute(
			language,
			surfaceKind,
			family,
			kind as never,
		),
	) as Parsed<Attestation<L, SK, F, K>>;
}

/**
 * Parses canonical or totalized presentation entities into canonical values.
 * Only recognized null presentation fields collapse; unknown fields and
 * non-null inapplicable features return `ParsingError`. Route coordinates are
 * authoritative.
 */
export const parseAs = {
	surface: parsePresentedAsSurface,
	lemma: parsePresentedAsLemma,
	attestation: parsePresentedAsAttestation,
} as const;
