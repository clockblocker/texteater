import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";

// The English Feature Pool (system ADR 0032): English picks from the universal
// pool only the features its routes use. Its routes still narrow the values.
export const EN_FEATURE_SCHEMA = {
	abbr: UNIVERSAL_FEATURE_SCHEMA.abbr,
	article: UNIVERSAL_FEATURE_SCHEMA.article,
	case: UNIVERSAL_FEATURE_SCHEMA.case,
	comparable: UNIVERSAL_FEATURE_SCHEMA.comparable,
	definite: UNIVERSAL_FEATURE_SCHEMA.definite,
	degree: UNIVERSAL_FEATURE_SCHEMA.degree,
	extPos: UNIVERSAL_FEATURE_SCHEMA.extPos,
	gender: UNIVERSAL_FEATURE_SCHEMA.gender,
	mood: UNIVERSAL_FEATURE_SCHEMA.mood,
	number: UNIVERSAL_FEATURE_SCHEMA.number,
	numForm: UNIVERSAL_FEATURE_SCHEMA.numForm,
	numType: UNIVERSAL_FEATURE_SCHEMA.numType,
	person: UNIVERSAL_FEATURE_SCHEMA.person,
	phrasal: UNIVERSAL_FEATURE_SCHEMA.phrasal,
	polarity: UNIVERSAL_FEATURE_SCHEMA.polarity,
	poss: UNIVERSAL_FEATURE_SCHEMA.poss,
	pronType: UNIVERSAL_FEATURE_SCHEMA.pronType,
	reflex: UNIVERSAL_FEATURE_SCHEMA.reflex,
	sourceLang: UNIVERSAL_FEATURE_SCHEMA.sourceLang,
	tense: UNIVERSAL_FEATURE_SCHEMA.tense,
	verbForm: UNIVERSAL_FEATURE_SCHEMA.verbForm,
	voice: UNIVERSAL_FEATURE_SCHEMA.voice,
} as const;
