import { buildLanguageSchema } from "../../../shared/builders.js";
import { deConstructionFusionFeaturesSchema } from "./construction/fusion.js";
import { deAdjectiveFeaturesSchema } from "./lexeme/adjective.js";
import { deAdpositionFeaturesSchema } from "./lexeme/adposition.js";
import { deAdverbFeaturesSchema } from "./lexeme/adverb.js";
import { deAuxiliaryFeaturesSchema } from "./lexeme/auxiliary.js";
import { deCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction.js";
import { deDeterminerFeaturesSchema } from "./lexeme/determiner.js";
import { deInterjectionFeaturesSchema } from "./lexeme/interjection.js";
import { deNounFeaturesSchema } from "./lexeme/noun.js";
import { deNumeralFeaturesSchema } from "./lexeme/numeral.js";
import { deOtherFeaturesSchema } from "./lexeme/other.js";
import { deParticleFeaturesSchema } from "./lexeme/particle.js";
import { dePronounFeaturesSchema } from "./lexeme/pronoun.js";
import { deProperNounFeaturesSchema } from "./lexeme/proper-noun.js";
import { dePunctuationFeaturesSchema } from "./lexeme/punctuation.js";
import { deSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction.js";
import { deSymbolFeaturesSchema } from "./lexeme/symbol.js";
import { deVerbFeaturesSchema } from "./lexeme/verb.js";
import { deCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix.js";
import { deCliticMorphemeFeaturesSchema } from "./morpheme/clitic.js";
import { deDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix.js";
import { deInfixMorphemeFeaturesSchema } from "./morpheme/infix.js";
import { deInterfixMorphemeFeaturesSchema } from "./morpheme/interfix.js";
import { dePrefixMorphemeFeaturesSchema } from "./morpheme/prefix.js";
import { deRootMorphemeFeaturesSchema } from "./morpheme/root.js";
import { deSuffixMorphemeFeaturesSchema } from "./morpheme/suffix.js";
import { deSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid.js";
import { deToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking.js";
import { deTransfixMorphemeFeaturesSchema } from "./morpheme/transfix.js";
import { deAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism.js";
import { deCollocationPhrasemeFeaturesSchema } from "./phraseme/collocation.js";
import { deDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula.js";
import { deIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom.js";
import { deProverbPhrasemeFeaturesSchema } from "./phraseme/proverb.js";

export const deSubtree = buildLanguageSchema("de", {
	Lexeme: {
		ADJ: deAdjectiveFeaturesSchema,
		ADP: deAdpositionFeaturesSchema,
		ADV: deAdverbFeaturesSchema,
		AUX: deAuxiliaryFeaturesSchema,
		CCONJ: deCoordinatingConjunctionFeaturesSchema,
		DET: deDeterminerFeaturesSchema,
		INTJ: deInterjectionFeaturesSchema,
		NOUN: deNounFeaturesSchema,
		NUM: deNumeralFeaturesSchema,
		PART: deParticleFeaturesSchema,
		PRON: dePronounFeaturesSchema,
		PROPN: deProperNounFeaturesSchema,
		PUNCT: dePunctuationFeaturesSchema,
		SCONJ: deSubordinatingConjunctionFeaturesSchema,
		SYM: deSymbolFeaturesSchema,
		VERB: deVerbFeaturesSchema,
		X: deOtherFeaturesSchema,
	},
	Morpheme: {
		Circumfix: deCircumfixMorphemeFeaturesSchema,
		Clitic: deCliticMorphemeFeaturesSchema,
		Duplifix: deDuplifixMorphemeFeaturesSchema,
		Infix: deInfixMorphemeFeaturesSchema,
		Interfix: deInterfixMorphemeFeaturesSchema,
		Prefix: dePrefixMorphemeFeaturesSchema,
		Root: deRootMorphemeFeaturesSchema,
		Suffix: deSuffixMorphemeFeaturesSchema,
		Suffixoid: deSuffixoidMorphemeFeaturesSchema,
		ToneMarking: deToneMarkingMorphemeFeaturesSchema,
		Transfix: deTransfixMorphemeFeaturesSchema,
	},
	Phraseme: {
		Aphorism: deAphorismPhrasemeFeaturesSchema,
		Collocation: deCollocationPhrasemeFeaturesSchema,
		DiscourseFormula: deDiscourseFormulaPhrasemeFeaturesSchema,
		Idiom: deIdiomPhrasemeFeaturesSchema,
		Proverb: deProverbPhrasemeFeaturesSchema,
	},
	Construction: {
		Fusion: deConstructionFusionFeaturesSchema,
	},
});
