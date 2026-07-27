import { buildLanguageSchema } from "../../../shared/builders";
import { deConstructionFusionFeaturesSchema } from "./construction/fusion";
import { deConstructionPairedFrameFeaturesSchema } from "./construction/paired-frame";
import { deAdjectiveFeaturesSchema } from "./lexeme/adjective";
import { deAdpositionFeaturesSchema } from "./lexeme/adposition";
import { deAdverbFeaturesSchema } from "./lexeme/adverb";
import { deAuxiliaryFeaturesSchema } from "./lexeme/auxiliary";
import { deCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction";
import { deDeterminerFeaturesSchema } from "./lexeme/determiner";
import { deInterjectionFeaturesSchema } from "./lexeme/interjection";
import { deNounFeaturesSchema } from "./lexeme/noun";
import { deNumeralFeaturesSchema } from "./lexeme/numeral";
import { deOtherFeaturesSchema } from "./lexeme/other";
import { deParticleFeaturesSchema } from "./lexeme/particle";
import { dePronounFeaturesSchema } from "./lexeme/pronoun";
import { deProperNounFeaturesSchema } from "./lexeme/proper-noun";
import { dePunctuationFeaturesSchema } from "./lexeme/punctuation";
import { deSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction";
import { deSymbolFeaturesSchema } from "./lexeme/symbol";
import { deVerbFeaturesSchema } from "./lexeme/verb";
import { deCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix";
import { deCliticMorphemeFeaturesSchema } from "./morpheme/clitic";
import { deDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix";
import { deInfixMorphemeFeaturesSchema } from "./morpheme/infix";
import { deInterfixMorphemeFeaturesSchema } from "./morpheme/interfix";
import { dePrefixMorphemeFeaturesSchema } from "./morpheme/prefix";
import { deRootMorphemeFeaturesSchema } from "./morpheme/root";
import { deSuffixMorphemeFeaturesSchema } from "./morpheme/suffix";
import { deSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid";
import { deToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking";
import { deTransfixMorphemeFeaturesSchema } from "./morpheme/transfix";
import { deAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism";
import { deDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula";
import { deIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom";
import { deProverbPhrasemeFeaturesSchema } from "./phraseme/proverb";

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
		DiscourseFormula: deDiscourseFormulaPhrasemeFeaturesSchema,
		Idiom: deIdiomPhrasemeFeaturesSchema,
		Proverb: deProverbPhrasemeFeaturesSchema,
	},
	Construction: {
		Fusion: deConstructionFusionFeaturesSchema,
		PairedFrame: deConstructionPairedFrameFeaturesSchema,
	},
});
