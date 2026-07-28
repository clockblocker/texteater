import type { ZodType } from "zod";
import { canonicalizeNullableProperties } from "../../../src/operations/shared/canonicalize-nullable";
import { schemasFor } from "../../../src/schema";
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
	const rawLemma = {
		language,
		canonicalLemma,
		lemmaKind,
		lemmaSubKind,
		inherentFeatures: (options.inherentFeatures ??
			{}) as InherentFeaturesFor<L, LK, LSK>,
		meaningInEmojis: options.meaningInEmojis ?? "🔤",
	};
	const languageSchemas = Reflect.get(schemasFor, language);
	const lemmaSchemas = Reflect.get(languageSchemas.entity.Lemma, lemmaKind);
	const getSchema = Reflect.get(lemmaSchemas, lemmaSubKind) as () => ZodType;
	const schema = getSchema();
	return schema.parse(
		canonicalizeNullableProperties(schema, rawLemma),
	) as Lemma<L, LK, LSK>;
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
		surfaceFeatures: null,
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
		surfaceFeatures: null,
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
		surfaceFeatures: null,
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
		surfaceFeatures: null,
	};
}
