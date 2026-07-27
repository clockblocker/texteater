import type {
	InherentFeaturesFor,
	Lemma,
	LemmaKindFor,
	LemmaSubKindFor,
	SupportedLanguage,
} from "../../../src/types";

type BuilderOptions<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
> = {
	inherentFeatures?: InherentFeaturesFor<L, LK, LSK>;
	meaningInEmojis?: string;
};

function makeLemma<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
>(
	language: L,
	lemmaKind: LK,
	lemmaSubKind: LSK,
	canonicalLemma: string,
	options: BuilderOptions<L, LK, LSK> = {},
): Lemma<L, LK, LSK> {
	return {
		language,
		canonicalLemma,
		lemmaKind,
		lemmaSubKind,
		inherentFeatures: (options.inherentFeatures ??
			{}) as InherentFeaturesFor<L, LK, LSK>,
		meaningInEmojis: options.meaningInEmojis ?? "🔤",
	} as Lemma<L, LK, LSK>;
}

export function makeLexemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaSubKindFor<L, "Lexeme" & LemmaKindFor<L>>,
>(
	language: L,
	lemmaSubKind: LSK,
	canonicalLemma: string,
	options: BuilderOptions<L, "Lexeme" & LemmaKindFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Lexeme" as "Lexeme" & LemmaKindFor<L>,
			lemmaSubKind,
			canonicalLemma,
			options,
		),
	};
}

export function makeMorphemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaSubKindFor<L, "Morpheme" & LemmaKindFor<L>>,
>(
	language: L,
	lemmaSubKind: LSK,
	canonicalLemma: string,
	options: BuilderOptions<L, "Morpheme" & LemmaKindFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Morpheme" as "Morpheme" & LemmaKindFor<L>,
			lemmaSubKind,
			canonicalLemma,
			options,
		),
	};
}

export function makePhrasemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaSubKindFor<L, "Phraseme" & LemmaKindFor<L>>,
>(
	language: L,
	lemmaSubKind: LSK,
	canonicalLemma: string,
	options: BuilderOptions<L, "Phraseme" & LemmaKindFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Phraseme" as "Phraseme" & LemmaKindFor<L>,
			lemmaSubKind,
			canonicalLemma,
			options,
		),
	};
}

export function makeConstructionSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaSubKindFor<L, "Construction" & LemmaKindFor<L>>,
>(
	language: L,
	lemmaSubKind: LSK,
	canonicalLemma: string,
	options: BuilderOptions<L, "Construction" & LemmaKindFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Construction" as "Construction" & LemmaKindFor<L>,
			lemmaSubKind,
			canonicalLemma,
			options,
		),
	};
}
