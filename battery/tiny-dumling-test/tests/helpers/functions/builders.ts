import type { ZodType } from "zod";
import { canonicalizeNullableProperties } from "../../../src/operations/shared/parse/canonicalize-nullable";
import { schemasFor } from "../../../src/schema";
import type {
	CoreFeaturesFor,
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "../../../src/types";

type BuilderOptions<
	L extends SupportedLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = {
	coreFeatures?: CoreFeaturesFor<L, LK, LSK>;
};

function makeLemma<
	L extends SupportedLanguage,
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
>(
	language: L,
	family: LK,
	kind: LSK,
	canonicalForm: string,
	options: BuilderOptions<L, LK, LSK> = {},
): Lemma<L, LK, LSK> {
	const rawLemma = {
		language,
		canonicalForm,
		family,
		kind,
		coreFeatures: (options.coreFeatures ?? {}) as CoreFeaturesFor<
			L,
			LK,
			LSK
		>,
	};
	const languageSchemas = Reflect.get(schemasFor, language);
	const entrySchemas = Reflect.get(languageSchemas.entity.Lemma, family);
	const getSchema = Reflect.get(entrySchemas, kind) as () => ZodType;
	const schema = getSchema();
	return schema.parse(
		canonicalizeNullableProperties(schema, rawLemma),
	) as Lemma<L, LK, LSK>;
}

export function makeLexemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaKindFor<L, "Lexeme" & LemmaFamilyFor<L>>,
>(
	language: L,
	kind: LSK,
	canonicalForm: string,
	options: BuilderOptions<L, "Lexeme" & LemmaFamilyFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Lexeme" as "Lexeme" & LemmaFamilyFor<L>,
			kind,
			canonicalForm,
			options,
		),
		surfaceFeatures: null,
	};
}

export function makeMorphemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaKindFor<L, "Morpheme" & LemmaFamilyFor<L>>,
>(
	language: L,
	kind: LSK,
	canonicalForm: string,
	options: BuilderOptions<L, "Morpheme" & LemmaFamilyFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Morpheme" as "Morpheme" & LemmaFamilyFor<L>,
			kind,
			canonicalForm,
			options,
		),
		surfaceFeatures: null,
	};
}

export function makePhrasemeSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaKindFor<L, "Phraseme" & LemmaFamilyFor<L>>,
>(
	language: L,
	kind: LSK,
	canonicalForm: string,
	options: BuilderOptions<L, "Phraseme" & LemmaFamilyFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Phraseme" as "Phraseme" & LemmaFamilyFor<L>,
			kind,
			canonicalForm,
			options,
		),
		surfaceFeatures: null,
	};
}

export function makeConstructionSurfaceReference<
	L extends SupportedLanguage,
	LSK extends LemmaKindFor<L, "Construction" & LemmaFamilyFor<L>>,
>(
	language: L,
	kind: LSK,
	canonicalForm: string,
	options: BuilderOptions<L, "Construction" & LemmaFamilyFor<L>, LSK> = {},
) {
	return {
		lemma: makeLemma(
			language,
			"Construction" as "Construction" & LemmaFamilyFor<L>,
			kind,
			canonicalForm,
			options,
		),
		surfaceFeatures: null,
	};
}
