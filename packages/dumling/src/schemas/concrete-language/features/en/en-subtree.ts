import { buildLanguageSchema } from "../../../shared/builders";
import { enConstructionFusionFeaturesSchema } from "./construction/fusion";
import { enConstructionPairedFrameFeaturesSchema } from "./construction/paired-frame";
import { enAdjectiveFeaturesSchema } from "./lexeme/adjective";
import { enAdpositionFeaturesSchema } from "./lexeme/adposition";
import { enAdverbFeaturesSchema } from "./lexeme/adverb";
import { enAuxiliaryFeaturesSchema } from "./lexeme/auxiliary";
import { enCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction";
import { enDeterminerFeaturesSchema } from "./lexeme/determiner";
import { enInterjectionFeaturesSchema } from "./lexeme/interjection";
import { enNounFeaturesSchema } from "./lexeme/noun";
import { enNumeralFeaturesSchema } from "./lexeme/numeral";
import { enOtherFeaturesSchema } from "./lexeme/other";
import { enParticleFeaturesSchema } from "./lexeme/particle";
import { enPronounFeaturesSchema } from "./lexeme/pronoun";
import { enProperNounFeaturesSchema } from "./lexeme/proper-noun";
import { enPunctuationFeaturesSchema } from "./lexeme/punctuation";
import { enSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction";
import { enSymbolFeaturesSchema } from "./lexeme/symbol";
import { enVerbFeaturesSchema } from "./lexeme/verb";
import { enCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix";
import { enCliticMorphemeFeaturesSchema } from "./morpheme/clitic";
import { enDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix";
import { enInfixMorphemeFeaturesSchema } from "./morpheme/infix";
import { enInterfixMorphemeFeaturesSchema } from "./morpheme/interfix";
import { enPrefixMorphemeFeaturesSchema } from "./morpheme/prefix";
import { enRootMorphemeFeaturesSchema } from "./morpheme/root";
import { enSuffixMorphemeFeaturesSchema } from "./morpheme/suffix";
import { enSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid";
import { enToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking";
import { enTransfixMorphemeFeaturesSchema } from "./morpheme/transfix";
import { enAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism";
import { enDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula";
import { enIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom";
import { enProverbPhrasemeFeaturesSchema } from "./phraseme/proverb";

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
