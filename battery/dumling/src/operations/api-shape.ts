import type { Descriptor } from "../types/descriptor.js";
import type {
	Attestation,
	AttestationOptionsFor,
	CoreFeaturesFor,
	DumlingBase64Url,
	DumlingCsv,
	DumlingDescriptorCsv,
	EntityValue,
	Lemma,
	LemmaFamily,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaIdentity,
	LemmaKindFor,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
	SurfaceKind,
	SurfaceKindFor,
} from "../types/public-types.js";

export type DumlingApi = {
	de: LanguageApi<"de">;
	en: LanguageApi<"en">;
	he: LanguageApi<"he">;
};

export type ApiResult<T, E> =
	| { success: true; data: T; error?: undefined }
	| { success: false; data?: undefined; error: E };

export type ParseErrorCode = "InvalidInput" | "LanguageNotImplemented";
export type ParseError = {
	code: ParseErrorCode;
	language?: SupportedLanguage;
	message: string;
	issues?: string[];
};

export type IdDecodeErrorCode =
	| "MalformedId"
	| "LanguageMismatch"
	| "EntityMismatch"
	| "InvalidPayload"
	| "LanguageNotImplemented";

export type IdDecodeError = {
	code: IdDecodeErrorCode;
	language?: SupportedLanguage;
	message: string;
};

export type IdDecodeSuccess<L extends SupportedLanguage = SupportedLanguage> = {
	format: "csv" | "base64url";
	language: L;
} & (
	| {
			kind: "Lemma";
			lemmaIdentity: LemmaIdentity<L>;
	  }
	| {
			kind: "Surface";
			surfaceIdentity: SurfaceIdentity<L>;
	  }
);

export type LanguageApi<L extends SupportedLanguage> = {
	create: {
		lemma<
			LK extends LemmaFamilyFor<L>,
			LSK extends LemmaKindFor<L, LK>,
		>(input: {
			canonicalForm: string;
			family: LK;
			kind: LSK;
			coreFeatures: CoreFeaturesFor<L, LK, LSK>;
			language?: unknown;
		}): Lemma<L, LK, LSK>;
		surface: {
			citation<
				TSurface extends Surface<
					L,
					CitationSurfaceKind<L>,
					LemmaFamilyForSurfaceKind<L, CitationSurfaceKind<L>>,
					LemmaKindFor<L, LemmaFamilyFor<L>>
				>,
			>(
				input: Omit<TSurface, "language" | "surfaceKind"> & {
					language?: unknown;
					surfaceKind?: unknown;
				},
			): TSurface;
			inflection<
				TSurface extends Surface<
					L,
					InflectionSurfaceKind<L>,
					LemmaFamilyForSurfaceKind<L, InflectionSurfaceKind<L>>,
					LemmaKindFor<L, LemmaFamilyFor<L>>
				>,
			>(
				input: Omit<TSurface, "language" | "surfaceKind"> & {
					language?: unknown;
					surfaceKind?: unknown;
				},
			): TSurface;
		};
		attestation<TAttestation extends Attestation<L>>(
			input: TAttestation,
		): TAttestation;
	};
	convert: {
		lemma: {
			toSurface<TLemma extends Lemma<L>>(
				lemma: TLemma,
			): Surface<
				L,
				CitationSurfaceKind<L>,
				TLemma["family"] &
					LemmaFamilyForSurfaceKind<L, CitationSurfaceKind<L>>,
				TLemma["kind"] &
					LemmaKindFor<L, TLemma["family"] & LemmaFamilyFor<L>>
			>;
			toAttestation<TLemma extends Lemma<L>>(
				lemma: TLemma,
				options: AttestationOptionsFor,
			): AttestationFromLemma<L, TLemma>;
		};
		surface: {
			toAttestation<TSurface extends Surface<L>>(
				surface: TSurface,
				options: AttestationOptionsFor,
			): AttestationFromSurface<L, TSurface>;
		};
	};
	extract: {
		lemma(value: Lemma<L> | Surface<L> | Attestation<L>): Lemma<L>;
	};
	parse: {
		lemma(input: unknown): ApiResult<Lemma<L>, ParseError>;
		surface(input: unknown): ApiResult<Surface<L>, ParseError>;
		attestation(input: unknown): ApiResult<Attestation<L>, ParseError>;
	};
	describe: {
		as: {
			lemma<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Lemma",
				L,
				EntityLemmaFamily<TValue> & LemmaFamilyFor<L>,
				EntityLemmaKind<TValue> &
					LemmaKindFor<
						L,
						EntityLemmaFamily<TValue> & LemmaFamilyFor<L>
					>
			>;
			surface<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Surface",
				L,
				EntityLemmaFamily<TValue> &
					LemmaFamilyForSurfaceKind<
						L,
						EntitySurfaceKind<TValue> & SurfaceKindFor<L>
					>,
				EntityLemmaKind<TValue> &
					LemmaKindFor<
						L,
						EntityLemmaFamily<TValue> & LemmaFamilyFor<L>
					>,
				EntitySurfaceKind<TValue> & SurfaceKindFor<L>
			>;
			attestation<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Attestation",
				L,
				EntityLemmaFamily<TValue> &
					LemmaFamilyForSurfaceKind<
						L,
						EntitySurfaceKind<TValue> & SurfaceKindFor<L>
					>,
				EntityLemmaKind<TValue> &
					LemmaKindFor<
						L,
						EntityLemmaFamily<TValue> & LemmaFamilyFor<L>
					>,
				EntitySurfaceKind<TValue> & SurfaceKindFor<L>
			>;
		};
		asCsv: {
			lemma<TValue extends EntityValue<L>>(
				value: TValue,
			): DumlingDescriptorCsv<L, "Lemma">;
			surface<TValue extends EntityValue<L>>(
				value: TValue,
			): DumlingDescriptorCsv<L, "Surface">;
			attestation<TValue extends EntityValue<L>>(
				value: TValue,
			): DumlingDescriptorCsv<L, "Attestation">;
		};
	};
	id: {
		encode: {
			asCsv(value: Lemma<L> | Surface<L>): DumlingCsv<L>;
			asBase64Url(
				value: Lemma<L> | Surface<L> | DumlingCsv<L>,
			): DumlingBase64Url<L>;
		};
		decode: {
			any(id: string): ApiResult<IdDecodeSuccess<L>, IdDecodeError>;
			asLemmaIdentity(
				id: string,
			): ApiResult<
				Extract<IdDecodeSuccess<L>, { kind: "Lemma" }>,
				IdDecodeError
			>;
			asSurfaceIdentity(
				id: string,
			): ApiResult<
				Extract<IdDecodeSuccess<L>, { kind: "Surface" }>,
				IdDecodeError
			>;
		};
	};
};

type CitationSurfaceKind<L extends SupportedLanguage> = Extract<
	SurfaceKindFor<L>,
	"Citation"
>;
type InflectionSurfaceKind<L extends SupportedLanguage> = Extract<
	SurfaceKindFor<L>,
	"Inflection"
>;
type AttestationFromLemma<
	L extends SupportedLanguage,
	TLemma extends Lemma<L>,
> =
	Lemma<L> extends TLemma
		? Attestation<L>
		: Attestation<L> &
				Attestation<
					L,
					CitationSurfaceKind<L>,
					TLemma["family"] &
						LemmaFamilyForSurfaceKind<L, CitationSurfaceKind<L>>,
					TLemma["kind"] &
						LemmaKindFor<L, TLemma["family"] & LemmaFamilyFor<L>>
				>;
type AttestationFromSurface<
	L extends SupportedLanguage,
	TSurface extends Surface<L>,
> =
	Surface<L> extends TSurface
		? Attestation<L>
		: Attestation<L> &
				Attestation<
					L,
					TSurface["surfaceKind"] & SurfaceKindFor<L>,
					TSurface["lemma"]["family"] &
						LemmaFamilyForSurfaceKind<
							L,
							TSurface["surfaceKind"] & SurfaceKindFor<L>
						>,
					TSurface["lemma"]["kind"] &
						LemmaKindFor<
							L,
							TSurface["lemma"]["family"] & LemmaFamilyFor<L>
						>
				>;
type EntityLemmaFamily<TValue> = TValue extends {
	family: infer LK extends LemmaFamily;
}
	? LK
	: TValue extends {
				lemma: { family: infer LK extends LemmaFamily };
			}
		? LK
		: TValue extends {
					surface: {
						lemma: {
							family: infer LK extends LemmaFamily;
						};
					};
				}
			? LK
			: never;
type EntityLemmaKind<TValue> = TValue extends {
	kind: infer LSK extends string;
}
	? LSK
	: TValue extends { lemma: { kind: infer LSK extends string } }
		? LSK
		: TValue extends {
					surface: {
						lemma: { kind: infer LSK extends string };
					};
				}
			? LSK
			: never;
type EntitySurfaceKind<TValue> = TValue extends {
	surfaceKind: infer SK extends SurfaceKind;
}
	? SK
	: TValue extends {
				surface: { surfaceKind: infer SK extends SurfaceKind };
			}
		? SK
		: TValue extends {
					family: LemmaFamily;
					kind: string;
				}
			? "Citation"
			: never;
