import type { Descriptor } from "../types/descriptor";
import type {
	DumlingBase64Url,
	DumlingCsv,
	DumlingDescriptorCsv,
	EntityForKind,
	EntityKind,
	EntityValue,
	InherentFeaturesFor,
	Lemma,
	LemmaKind,
	LemmaKindFor,
	LemmaKindForSurfaceKind,
	LemmaSubKindFor,
	Selection,
	SelectionFeatures,
	SelectionOptionsFor,
	SupportedLanguage,
	Surface,
	SurfaceKind,
	SurfaceKindFor,
} from "../types/public-types";

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
			lemma: Lemma<L>;
	  }
	| {
			kind: "Surface";
			surface: Surface<L>;
	  }
	| {
			kind: "Selection";
			selection: Selection<L>;
	  }
);

export type LanguageApi<L extends SupportedLanguage> = {
	create: {
		lemma<
			LK extends LemmaKindFor<L>,
			LSK extends LemmaSubKindFor<L, LK>,
		>(input: {
			canonicalLemma: string;
			lemmaKind: LK;
			lemmaSubKind: LSK;
			inherentFeatures: InherentFeaturesFor<L, LK, LSK>;
			meaningInEmojis: string;
			language?: unknown;
		}): Lemma<L, LK, LSK>;
		surface: {
			citation<
				TSurface extends Surface<
					L,
					CitationSurfaceKind<L>,
					LemmaKindForSurfaceKind<L, CitationSurfaceKind<L>>,
					LemmaSubKindFor<L, LemmaKindFor<L>>
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
					LemmaKindForSurfaceKind<L, InflectionSurfaceKind<L>>,
					LemmaSubKindFor<L, LemmaKindFor<L>>
				>,
			>(
				input: Omit<TSurface, "language" | "surfaceKind"> & {
					language?: unknown;
					surfaceKind?: unknown;
				},
			): TSurface;
		};
		selection<TSelection extends Selection<L>>(
			input: Omit<TSelection, "language"> & {
				language?: unknown;
			},
		): TSelection;
	};
	convert: {
		lemma: {
			toSurface<TLemma extends Lemma<L>>(
				lemma: TLemma,
			): Surface<
				L,
				CitationSurfaceKind<L>,
				TLemma["lemmaKind"] &
					LemmaKindForSurfaceKind<L, CitationSurfaceKind<L>>,
				TLemma["lemmaSubKind"] &
					LemmaSubKindFor<L, TLemma["lemmaKind"] & LemmaKindFor<L>>
			>;
			toSelection<TLemma extends Lemma<L>>(
				lemma: TLemma,
				options?: SelectionOptionsFor,
			): SelectionFromLemma<L, TLemma>;
		};
		surface: {
			toSelection<TSurface extends Surface<L>>(
				surface: TSurface,
				options?: SelectionOptionsFor,
			): SelectionFromSurface<L, TSurface>;
		};
	};
	extract: {
		lemma(value: Lemma<L> | Surface<L> | Selection<L>): Lemma<L>;
	};
	parse: {
		lemma(input: unknown): ApiResult<Lemma<L>, ParseError>;
		surface(input: unknown): ApiResult<Surface<L>, ParseError>;
		selection(input: unknown): ApiResult<Selection<L>, ParseError>;
	};
	describe: {
		as: {
			lemma<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Lemma",
				L,
				EntityLemmaKind<TValue> & LemmaKindFor<L>,
				EntityLemmaSubKind<TValue> &
					LemmaSubKindFor<
						L,
						EntityLemmaKind<TValue> & LemmaKindFor<L>
					>
			>;
			surface<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Surface",
				L,
				EntityLemmaKind<TValue> &
					LemmaKindForSurfaceKind<
						L,
						EntitySurfaceKind<TValue> & SurfaceKindFor<L>
					>,
				EntityLemmaSubKind<TValue> &
					LemmaSubKindFor<
						L,
						EntityLemmaKind<TValue> & LemmaKindFor<L>
					>,
				EntitySurfaceKind<TValue> & SurfaceKindFor<L>
			>;
			selection<TValue extends EntityValue<L>>(
				value: TValue,
			): Descriptor<
				"Selection",
				L,
				EntityLemmaKind<TValue> &
					LemmaKindForSurfaceKind<
						L,
						EntitySurfaceKind<TValue> & SurfaceKindFor<L>
					>,
				EntityLemmaSubKind<TValue> &
					LemmaSubKindFor<
						L,
						EntityLemmaKind<TValue> & LemmaKindFor<L>
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
			selection<TValue extends EntityValue<L>>(
				value: TValue,
			): DumlingDescriptorCsv<L, "Selection">;
		};
	};
	id: {
		encode: {
			asCsv(value: Lemma<L> | Surface<L> | Selection<L>): DumlingCsv<L>;
			asBase64Url(
				value: Lemma<L> | Surface<L> | Selection<L> | DumlingCsv<L>,
			): DumlingBase64Url<L>;
		};
		decode: {
			any(id: string): ApiResult<IdDecodeSuccess<L>, IdDecodeError>;
			asLemma(
				id: string,
			): ApiResult<
				Extract<IdDecodeSuccess<L>, { kind: "Lemma" }>,
				IdDecodeError
			>;
			asSurface(
				id: string,
			): ApiResult<
				Extract<IdDecodeSuccess<L>, { kind: "Surface" }>,
				IdDecodeError
			>;
			asSelection(
				id: string,
			): ApiResult<
				Extract<IdDecodeSuccess<L>, { kind: "Selection" }>,
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
type SelectionFromLemma<
	L extends SupportedLanguage,
	TLemma extends Lemma<L>,
> = Lemma<L> extends TLemma
	? Selection<L>
	: Selection<L> &
			Selection<
				L,
				CitationSurfaceKind<L>,
				TLemma["lemmaKind"] &
					LemmaKindForSurfaceKind<L, CitationSurfaceKind<L>>,
				TLemma["lemmaSubKind"] &
					LemmaSubKindFor<L, TLemma["lemmaKind"] & LemmaKindFor<L>>
			>;
type SelectionFromSurface<
	L extends SupportedLanguage,
	TSurface extends Surface<L>,
> = Surface<L> extends TSurface
	? Selection<L>
	: Selection<L> &
			Selection<
				L,
				TSurface["surfaceKind"] & SurfaceKindFor<L>,
				TSurface["lemma"]["lemmaKind"] &
					LemmaKindForSurfaceKind<
						L,
						TSurface["surfaceKind"] & SurfaceKindFor<L>
					>,
				TSurface["lemma"]["lemmaSubKind"] &
					LemmaSubKindFor<
						L,
						TSurface["lemma"]["lemmaKind"] & LemmaKindFor<L>
					>
			>;
type EntityLemmaKind<TValue> = TValue extends {
	lemmaKind: infer LK extends LemmaKind;
}
	? LK
	: TValue extends { lemma: { lemmaKind: infer LK extends LemmaKind } }
		? LK
		: TValue extends {
					surface: {
						lemma: { lemmaKind: infer LK extends LemmaKind };
					};
				}
			? LK
			: never;
type EntityLemmaSubKind<TValue> = TValue extends {
	lemmaSubKind: infer LSK extends string;
}
	? LSK
	: TValue extends { lemma: { lemmaSubKind: infer LSK extends string } }
		? LSK
		: TValue extends {
					surface: {
						lemma: { lemmaSubKind: infer LSK extends string };
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
		: TValue extends { lemmaKind: LemmaKind; lemmaSubKind: string }
			? "Citation"
			: never;
