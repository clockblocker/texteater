import {
	dumling as baseDumling,
	getLanguageApi as getBaseLanguageApi,
	supportedLanguages,
} from "dumling";
import type {
	ApiResult,
	DumlingApi as BaseDumlingApi,
	DumlingCsv,
	EntityKind,
	IdDecodeError,
	InflectionalFeaturesFor,
	InherentFeaturesFor,
	LanguageApi as BaseLanguageApi,
	Lemma as BaseLemma,
	LemmaKindFor,
	LemmaSubKindFor,
	ParseError,
	SupportedLanguage,
} from "dumling/types";

export { supportedLanguages };

export type Lemma<
	L extends SupportedLanguage = SupportedLanguage,
	LK extends LemmaKindFor<L> = LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK> = LemmaSubKindFor<L, LK>,
> = BaseLemma<L, LK, LSK>;

export type SurfaceKind = "Lemma" | "Inflection";
export type OrthographicStatus = "Standard" | "Typo";
export type SelectionCoverage = "Full" | "Partial";
export type SpellingRelation = "Canonical" | "Variant";

export type Surface<
	L extends SupportedLanguage = SupportedLanguage,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKindFor<L> = LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK> = LemmaSubKindFor<L, LK>,
> = {
	language: L;
	normalizedFullSurface: string;
	surfaceKind: SK;
	lemma: Lemma<L, LK, LSK>;
} & (SK extends "Inflection"
	? {
			inflectionalFeatures: InflectionalFeaturesFor<L, LK, LSK>;
		}
	: Record<never, never>);

export type Selection<
	L extends SupportedLanguage = SupportedLanguage,
	OS extends OrthographicStatus = OrthographicStatus,
	SK extends SurfaceKind = SurfaceKind,
	LK extends LemmaKindFor<L> = LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK> = LemmaSubKindFor<L, LK>,
> = {
	language: L;
	orthographicStatus: OS;
	selectionCoverage: SelectionCoverage;
	spellingRelation: SpellingRelation;
	spelledSelection: string;
	surface: Surface<L, SK, LK, LSK>;
};

export type EntityValue<L extends SupportedLanguage = SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Selection<L>;

export type DumlingId<
	K extends EntityKind = EntityKind,
	L extends SupportedLanguage = SupportedLanguage,
> = DumlingCsv<L> & {
	readonly __dumlingIdKind?: K;
	readonly __dumlingIdLanguage?: L;
};

export type DumlingIdInspection<
	L extends SupportedLanguage = SupportedLanguage,
> = {
	format: "csv" | "base64url";
	kind: EntityKind;
	language: L;
};

type LanguageApi<L extends SupportedLanguage> = {
	create: BaseLanguageApi<L>["create"];
	convert: {
		lemma: {
			toSurface<LK extends LemmaKindFor<L>, LSK extends LemmaSubKindFor<L, LK>>(
				lemma: Lemma<L, LK, LSK>,
			): Surface<L, "Lemma", LK, LSK>;
		};
	};
	extract: {
		lemma(value: EntityValue<L>): Lemma<L>;
	};
	parse: {
		lemma(input: unknown): ApiResult<Lemma<L>, ParseError>;
		surface(input: unknown): ApiResult<Surface<L>, ParseError>;
		selection(input: unknown): ApiResult<Selection<L>, ParseError>;
	};
	id: {
		encode(value: EntityValue<L>): DumlingId<EntityKind, L>;
		decode: {
			any(id: string): ApiResult<DumlingIdInspection<L>, IdDecodeError>;
		};
	};
};

export type { EntityKind, InherentFeaturesFor, LanguageApi, LemmaKindFor, LemmaSubKindFor, SupportedLanguage };

export type DumlingApi = {
	[L in SupportedLanguage]: LanguageApi<L>;
};

export type DumlingEntityKind = EntityKind;

function isSelection<L extends SupportedLanguage>(
	value: EntityValue<L>,
): value is Selection<L> {
	return "surface" in value && "spelledSelection" in value;
}

function isSurface<L extends SupportedLanguage>(
	value: EntityValue<L>,
): value is Surface<L> {
	return "normalizedFullSurface" in value;
}

function toBaseSurface<L extends SupportedLanguage>(value: Surface<L>) {
	const baseValue = {
		...value,
		surfaceKind: value.surfaceKind === "Lemma" ? "Citation" : "Inflection",
	};
	return baseValue as Parameters<BaseLanguageApi<L>["id"]["encode"]["asCsv"]>[0];
}

function fromBaseSurface<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
>(
	value: ReturnType<BaseLanguageApi<L>["convert"]["lemma"]["toSurface"]>,
): Surface<L, "Lemma", LK, LSK> {
	return {
		...value,
		surfaceKind: "Lemma",
	} as Surface<L, "Lemma", LK, LSK>;
}

function toBaseSelection<L extends SupportedLanguage>(value: Selection<L>) {
	const selectionFeatures: {
		coverage?: "Partial";
		orthography?: "Typo";
		spelling?: "Variant";
	} = {};
	if (value.selectionCoverage === "Partial") {
		selectionFeatures.coverage = "Partial";
	}
	if (value.orthographicStatus === "Typo") {
		selectionFeatures.orthography = "Typo";
	}
	if (value.spellingRelation === "Variant") {
		selectionFeatures.spelling = "Variant";
	}

	return {
		language: value.language,
		selectionFeatures:
			Object.keys(selectionFeatures).length > 0 ? selectionFeatures : undefined,
		spelledSelection: value.spelledSelection,
		surface: toBaseSurface(value.surface),
	} as Parameters<BaseLanguageApi<L>["id"]["encode"]["asCsv"]>[0];
}

function fromBaseSelection<L extends SupportedLanguage>(
	value: {
		language: L;
		spelledSelection: string;
		surface: ReturnType<BaseLanguageApi<L>["convert"]["lemma"]["toSurface"]>;
		selectionFeatures?: {
			coverage?: "Partial";
			orthography?: "Typo";
			spelling?: "Variant";
		};
	},
): Selection<L> {
	return {
		language: value.language,
		orthographicStatus:
			value.selectionFeatures?.orthography === "Typo" ? "Typo" : "Standard",
		selectionCoverage:
			value.selectionFeatures?.coverage === "Partial" ? "Partial" : "Full",
		spellingRelation:
			value.selectionFeatures?.spelling === "Variant"
				? "Variant"
				: "Canonical",
		spelledSelection: value.spelledSelection,
		surface: {
			...value.surface,
			surfaceKind:
				value.surface.surfaceKind === "Inflection" ? "Inflection" : "Lemma",
		} as Surface<L>,
	};
}

function toBaseEntityValue<L extends SupportedLanguage>(value: EntityValue<L>) {
	if (isSelection(value)) {
		return toBaseSelection(value);
	}
	if (isSurface(value)) {
		return toBaseSurface(value);
	}
	return value as Parameters<BaseLanguageApi<L>["id"]["encode"]["asCsv"]>[0];
}

function inspectWithLanguage<L extends SupportedLanguage>(
	language: L,
	id: string,
): ApiResult<DumlingIdInspection<L>, IdDecodeError> {
	const decoded = getBaseLanguageApi(language).id.decode.any(id);
	if (!decoded.success) {
		return decoded;
	}
	return {
		success: true,
		data: {
			format: decoded.data.format,
			kind: decoded.data.kind,
			language: decoded.data.language,
		},
	};
}

function createLanguageApi<L extends SupportedLanguage>(language: L): LanguageApi<L> {
	const baseApi = getBaseLanguageApi(language);
	return {
		create: baseApi.create,
		convert: {
			lemma: {
				toSurface(lemma) {
					return fromBaseSurface<L, typeof lemma.lemmaKind, typeof lemma.lemmaSubKind>(
						baseApi.convert.lemma.toSurface(lemma as unknown as Lemma<L>),
					);
				},
			},
		},
		extract: {
			lemma(value) {
				if (isSelection(value)) {
					return value.surface.lemma;
				}
				if (isSurface(value)) {
					return value.lemma;
				}
				return value;
			},
		},
		parse: {
			lemma(input) {
				return baseApi.parse.lemma(input) as ApiResult<Lemma<L>, ParseError>;
			},
			surface(input) {
				const parsed = baseApi.parse.surface(
					isSurface(input as EntityValue<L>)
						? toBaseSurface(input as Surface<L>)
						: input,
				);
				if (!parsed.success) {
					return parsed;
				}
				return {
					success: true,
					data: {
						...parsed.data,
						surfaceKind:
							parsed.data.surfaceKind === "Inflection" ? "Inflection" : "Lemma",
					} as Surface<L>,
				};
			},
			selection(input) {
				const parsed = baseApi.parse.selection(
					isSelection(input as EntityValue<L>)
						? toBaseSelection(input as Selection<L>)
						: input,
				);
				if (!parsed.success) {
					return parsed;
				}
				return {
					success: true,
					data: fromBaseSelection(
						parsed.data as {
							language: L;
							spelledSelection: string;
							surface: ReturnType<BaseLanguageApi<L>["convert"]["lemma"]["toSurface"]>;
							selectionFeatures?: {
								coverage?: "Partial";
								orthography?: "Typo";
								spelling?: "Variant";
							};
						},
					),
				};
			},
		},
		id: {
			encode(value) {
				return baseApi.id.encode.asCsv(toBaseEntityValue(value)) as DumlingId<
					EntityKind,
					L
				>;
			},
			decode: {
				any(id) {
					return inspectWithLanguage(language, id);
				},
			},
		},
	};
}

const languageApis = Object.fromEntries(
	supportedLanguages.map((language) => [language, createLanguageApi(language)]),
) as DumlingApi;

export const dumling: DumlingApi = {
	...languageApis,
};

export function getLanguageApi<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L> {
	return languageApis[language];
}

export function makeDumlingIdFor<L extends SupportedLanguage>(
	language: L,
	value: Lemma<L>,
): DumlingId<"Lemma", L>;
export function makeDumlingIdFor<L extends SupportedLanguage>(
	language: L,
	value: Surface<L>,
): DumlingId<"Surface", L>;
export function makeDumlingIdFor<L extends SupportedLanguage>(
	language: L,
	value: Selection<L>,
): DumlingId<"Selection", L>;
export function makeDumlingIdFor<L extends SupportedLanguage>(
	language: L,
	value: EntityValue<L>,
) {
	return getLanguageApi(language).id.encode(value);
}

export function inspectId(id: string): DumlingIdInspection | undefined {
	for (const language of supportedLanguages) {
		const inspected = inspectWithLanguage(language, id);
		if (inspected.success) {
			return inspected.data;
		}
	}
	return undefined;
}

export function inspectDumlingId(id: string): DumlingIdInspection | undefined {
	return inspectId(id);
}

void baseDumling;
