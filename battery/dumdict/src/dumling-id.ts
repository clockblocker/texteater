import { buildIdOperations, supportedLanguages } from "dumling/id";
import type {
	DumlingCsv,
	IdDecodeSuccess,
	LanguageApi,
	Lemma,
	SupportedLanguage,
	Surface,
} from "dumling/types";

declare const surfaceIdBrand: unique symbol;

export type SurfaceId<L extends SupportedLanguage = SupportedLanguage> =
	DumlingCsv<L> & {
		readonly [surfaceIdBrand]: "Surface";
	};

type IdParsers = {
	[Language in SupportedLanguage]: Pick<
		LanguageApi<Language>["parse"],
		"lemma" | "surface"
	>;
};

let idParsers: IdParsers | undefined;

/** Initializes the codec with the package's exact generated guard parsers. */
export function configureDumdictIdParsers(parsers: IdParsers): void {
	idParsers = parsers;
}

function buildDumdictIdOperations<const L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["id"] {
	const parsers = idParsers?.[language];
	if (parsers === undefined) {
		throw new ReferenceError("Dumdict ID parsers are not initialized.");
	}
	return buildIdOperations(
		language,
		parsers as Pick<LanguageApi<L>["parse"], "lemma" | "surface">,
	);
}

const idOperations = {
	de: undefined,
	en: undefined,
	he: undefined,
} as {
	[Language in SupportedLanguage]: LanguageApi<Language>["id"] | undefined;
};

function getDumdictIdOperations<const L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["id"] {
	const cached = idOperations[language];
	if (cached !== undefined) return cached as LanguageApi<L>["id"];
	const created = buildDumdictIdOperations(language);
	idOperations[language] = created as (typeof idOperations)[L];
	return created;
}

export function makeSurfaceId<L extends SupportedLanguage>(
	language: L,
	surface: Surface<L>,
): SurfaceId<L> {
	return getDumdictIdOperations(language).encode.asCsv(
		surface,
	) as SurfaceId<L>;
}

export function makeLemmaId<L extends SupportedLanguage>(
	language: L,
	lemma: Lemma<L>,
): DumlingCsv<L> {
	return getDumdictIdOperations(language).encode.asCsv(lemma);
}

export type DumlingIdInspection<
	L extends SupportedLanguage = SupportedLanguage,
> = {
	format: "csv" | "base64url";
	kind: IdDecodeSuccess<L>["kind"];
	language: L;
};

export function inspectDumlingId(id: string): DumlingIdInspection | undefined {
	for (const language of supportedLanguages) {
		const decoded = getDumdictIdOperations(language).decode.any(id);
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
