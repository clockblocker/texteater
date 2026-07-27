import { buildLanguageSchema } from "../../../shared/builders.js";
import { enConstructionFusionFeaturesSchema } from "./construction/fusion.js";
import { enConstructionPairedFrameFeaturesSchema } from "./construction/paired-frame.js";
import { enAdjectiveFeaturesSchema } from "./lexeme/adjective.js";
import { enAdpositionFeaturesSchema } from "./lexeme/adposition.js";
import { enAdverbFeaturesSchema } from "./lexeme/adverb.js";
import { enAuxiliaryFeaturesSchema } from "./lexeme/auxiliary.js";
import { enCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction.js";
import { enDeterminerFeaturesSchema } from "./lexeme/determiner.js";
import { enInterjectionFeaturesSchema } from "./lexeme/interjection.js";
import { enNounFeaturesSchema } from "./lexeme/noun.js";
import { enNumeralFeaturesSchema } from "./lexeme/numeral.js";
import { enOtherFeaturesSchema } from "./lexeme/other.js";
import { enParticleFeaturesSchema } from "./lexeme/particle.js";
import { enPronounFeaturesSchema } from "./lexeme/pronoun.js";
import { enProperNounFeaturesSchema } from "./lexeme/proper-noun.js";
import { enPunctuationFeaturesSchema } from "./lexeme/punctuation.js";
import { enSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction.js";
import { enSymbolFeaturesSchema } from "./lexeme/symbol.js";
import { enVerbFeaturesSchema } from "./lexeme/verb.js";
import { enCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix.js";
import { enCliticMorphemeFeaturesSchema } from "./morpheme/clitic.js";
import { enDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix.js";
import { enInfixMorphemeFeaturesSchema } from "./morpheme/infix.js";
import { enInterfixMorphemeFeaturesSchema } from "./morpheme/interfix.js";
import { enPrefixMorphemeFeaturesSchema } from "./morpheme/prefix.js";
import { enRootMorphemeFeaturesSchema } from "./morpheme/root.js";
import { enSuffixMorphemeFeaturesSchema } from "./morpheme/suffix.js";
import { enSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid.js";
import { enToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking.js";
import { enTransfixMorphemeFeaturesSchema } from "./morpheme/transfix.js";
import { enAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism.js";
import { enDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula.js";
import { enIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom.js";
import { enProverbPhrasemeFeaturesSchema } from "./phraseme/proverb.js";

export const enSubtree = buildLanguageSchema("en", {
	Lexeme: {
		ADJ: enAdjectiveFeaturesSchema,
		ADP: enAdpositionFeaturesSchema,
		ADV: enAdverbFeaturesSchema,
		AUX: enAuxiliaryFeaturesSchema,
		CCONJ: enCoordinatingConjunctionFeaturesSchema,
		DET: enDeterminerFeaturesSchema,
		INTJ: enInterjectionFeaturesSchema,
		NOUN: enNounFeaturesSchema,
		NUM: enNumeralFeaturesSchema,
		PART: enParticleFeaturesSchema,
		PRON: enPronounFeaturesSchema,
		PROPN: enProperNounFeaturesSchema,
		PUNCT: enPunctuationFeaturesSchema,
		SCONJ: enSubordinatingConjunctionFeaturesSchema,
		SYM: enSymbolFeaturesSchema,
		VERB: enVerbFeaturesSchema,
		X: enOtherFeaturesSchema,
	},
	Morpheme: {
		Circumfix: enCircumfixMorphemeFeaturesSchema,
		Clitic: enCliticMorphemeFeaturesSchema,
		Duplifix: enDuplifixMorphemeFeaturesSchema,
		Infix: enInfixMorphemeFeaturesSchema,
		Interfix: enInterfixMorphemeFeaturesSchema,
		Prefix: enPrefixMorphemeFeaturesSchema,
		Root: enRootMorphemeFeaturesSchema,
		Suffix: enSuffixMorphemeFeaturesSchema,
		Suffixoid: enSuffixoidMorphemeFeaturesSchema,
		ToneMarking: enToneMarkingMorphemeFeaturesSchema,
		Transfix: enTransfixMorphemeFeaturesSchema,
	},
	Phraseme: {
		Aphorism: enAphorismPhrasemeFeaturesSchema,
		DiscourseFormula: enDiscourseFormulaPhrasemeFeaturesSchema,
		Idiom: enIdiomPhrasemeFeaturesSchema,
		Proverb: enProverbPhrasemeFeaturesSchema,
	},
	Construction: {
		Fusion: enConstructionFusionFeaturesSchema,
		PairedFrame: enConstructionPairedFrameFeaturesSchema,
	},
});
