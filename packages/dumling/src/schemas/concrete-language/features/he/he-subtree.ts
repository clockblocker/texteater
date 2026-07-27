import { buildLanguageSchema } from "../../../shared/builders";
import { heConstructionFusionFeaturesSchema } from "./construction/fusion";
import { heConstructionPairedFrameFeaturesSchema } from "./construction/paired-frame";
import { heAdjectiveFeaturesSchema } from "./lexeme/adjective";
import { heAdpositionFeaturesSchema } from "./lexeme/adposition";
import { heAdverbFeaturesSchema } from "./lexeme/adverb";
import { heAuxiliaryFeaturesSchema } from "./lexeme/auxiliary";
import { heCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction";
import { heDeterminerFeaturesSchema } from "./lexeme/determiner";
import { heInterjectionFeaturesSchema } from "./lexeme/interjection";
import { heNounFeaturesSchema } from "./lexeme/noun";
import { heNumeralFeaturesSchema } from "./lexeme/numeral";
import { heOtherFeaturesSchema } from "./lexeme/other";
import { heParticleFeaturesSchema } from "./lexeme/particle";
import { hePronounFeaturesSchema } from "./lexeme/pronoun";
import { heProperNounFeaturesSchema } from "./lexeme/proper-noun";
import { hePunctuationFeaturesSchema } from "./lexeme/punctuation";
import { heSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction";
import { heSymbolFeaturesSchema } from "./lexeme/symbol";
import { heVerbFeaturesSchema } from "./lexeme/verb";
import { heCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix";
import { heCliticMorphemeFeaturesSchema } from "./morpheme/clitic";
import { heDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix";
import { heInfixMorphemeFeaturesSchema } from "./morpheme/infix";
import { heInterfixMorphemeFeaturesSchema } from "./morpheme/interfix";
import { hePrefixMorphemeFeaturesSchema } from "./morpheme/prefix";
import { heRootMorphemeFeaturesSchema } from "./morpheme/root";
import { heSuffixMorphemeFeaturesSchema } from "./morpheme/suffix";
import { heSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid";
import { heToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking";
import { heTransfixMorphemeFeaturesSchema } from "./morpheme/transfix";
import { heAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism";
import { heDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula";
import { heIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom";
import { heProverbPhrasemeFeaturesSchema } from "./phraseme/proverb";

export const heSubtree = buildLanguageSchema("he", {
	Lexeme: {
		ADJ: heAdjectiveFeaturesSchema,
		ADP: heAdpositionFeaturesSchema,
		ADV: heAdverbFeaturesSchema,
		AUX: heAuxiliaryFeaturesSchema,
		CCONJ: heCoordinatingConjunctionFeaturesSchema,
		DET: heDeterminerFeaturesSchema,
		INTJ: heInterjectionFeaturesSchema,
		NOUN: heNounFeaturesSchema,
		NUM: heNumeralFeaturesSchema,
		PART: heParticleFeaturesSchema,
		PRON: hePronounFeaturesSchema,
		PROPN: heProperNounFeaturesSchema,
		PUNCT: hePunctuationFeaturesSchema,
		SCONJ: heSubordinatingConjunctionFeaturesSchema,
		SYM: heSymbolFeaturesSchema,
		VERB: heVerbFeaturesSchema,
		X: heOtherFeaturesSchema,
	},
	Morpheme: {
		Circumfix: heCircumfixMorphemeFeaturesSchema,
		Clitic: heCliticMorphemeFeaturesSchema,
		Duplifix: heDuplifixMorphemeFeaturesSchema,
		Infix: heInfixMorphemeFeaturesSchema,
		Interfix: heInterfixMorphemeFeaturesSchema,
		Prefix: hePrefixMorphemeFeaturesSchema,
		Root: heRootMorphemeFeaturesSchema,
		Suffix: heSuffixMorphemeFeaturesSchema,
		Suffixoid: heSuffixoidMorphemeFeaturesSchema,
		ToneMarking: heToneMarkingMorphemeFeaturesSchema,
		Transfix: heTransfixMorphemeFeaturesSchema,
	},
	Phraseme: {
		Aphorism: heAphorismPhrasemeFeaturesSchema,
		DiscourseFormula: heDiscourseFormulaPhrasemeFeaturesSchema,
		Idiom: heIdiomPhrasemeFeaturesSchema,
		Proverb: heProverbPhrasemeFeaturesSchema,
	},
	Construction: {
		Fusion: heConstructionFusionFeaturesSchema,
		PairedFrame: heConstructionPairedFrameFeaturesSchema,
	},
});
