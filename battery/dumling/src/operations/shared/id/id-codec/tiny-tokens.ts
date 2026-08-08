import type {
	SupportedLanguage,
	SurfaceKind,
} from "../../../../types/public-types.js";

type TokenMap<T extends string> = Record<T, string>;

export const languageTokens = {
	de: "de",
	en: "en",
	he: "he",
} as const satisfies TokenMap<SupportedLanguage>;

export const entityKindTokens = {
	Lemma: "l",
	Surface: "s",
} as const;

export const surfaceKindTokens = {
	Citation: "c",
	Inflection: "i",
} as const satisfies TokenMap<SurfaceKind>;
