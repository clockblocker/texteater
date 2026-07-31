import { dumling, getLanguageApi, supportedLanguages } from "dumling";
import type {
	CoreFeaturesFor,
	DumlingApi,
	DumlingCsv,
	EntityKind,
	Lemma,
	LemmaFamilyFor,
	LemmaIdentity,
	LemmaKindFor,
	Selection,
	SelectionIdentity,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
} from "dumling/types";

export type {
	CoreFeaturesFor,
	DumlingApi,
	EntityKind,
	Lemma,
	LemmaFamilyFor,
	LemmaIdentity,
	LemmaKindFor,
	Selection,
	SelectionIdentity,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
};
export { dumling, getLanguageApi, supportedLanguages };

declare const surfaceIdBrand: unique symbol;

export type SurfaceId<L extends SupportedLanguage = SupportedLanguage> =
	DumlingCsv<L> & {
		readonly [surfaceIdBrand]: "Surface";
	};

export function makeSurfaceId<L extends SupportedLanguage>(
	language: L,
	surface: Surface<L>,
): SurfaceId<L> {
	return getLanguageApi(language).id.encode.asCsv(surface) as SurfaceId<L>;
}

export type DumlingIdInspection<
	L extends SupportedLanguage = SupportedLanguage,
> = {
	format: "csv" | "base64url";
	kind: EntityKind;
	language: L;
};

export function inspectDumlingId(id: string): DumlingIdInspection | undefined {
	for (const language of supportedLanguages) {
		const decoded = getLanguageApi(language).id.decode.any(id);
		if (decoded.success) {
			return {
				format: decoded.data.format,
				kind: decoded.data.kind,
				language: decoded.data.language,
			};
		}
	}
	return undefined;
}
