import { buildLanguageSchema } from "../../../shared/builders.js";
import { heConstructionFusionFeaturesSchema } from "./construction/fusion.js";
import { heConstructionPairedFrameFeaturesSchema } from "./construction/paired-frame.js";
import { heAdjectiveFeaturesSchema } from "./lexeme/adjective.js";
import { heAdpositionFeaturesSchema } from "./lexeme/adposition.js";
import { heAdverbFeaturesSchema } from "./lexeme/adverb.js";
import { heAuxiliaryFeaturesSchema } from "./lexeme/auxiliary.js";
import { heCoordinatingConjunctionFeaturesSchema } from "./lexeme/coordinating-conjunction.js";
import { heDeterminerFeaturesSchema } from "./lexeme/determiner.js";
import { heInterjectionFeaturesSchema } from "./lexeme/interjection.js";
import { heNounFeaturesSchema } from "./lexeme/noun.js";
import { heNumeralFeaturesSchema } from "./lexeme/numeral.js";
import { heOtherFeaturesSchema } from "./lexeme/other.js";
import { heParticleFeaturesSchema } from "./lexeme/particle.js";
import { hePronounFeaturesSchema } from "./lexeme/pronoun.js";
import { heProperNounFeaturesSchema } from "./lexeme/proper-noun.js";
import { hePunctuationFeaturesSchema } from "./lexeme/punctuation.js";
import { heSubordinatingConjunctionFeaturesSchema } from "./lexeme/subordinating-conjunction.js";
import { heSymbolFeaturesSchema } from "./lexeme/symbol.js";
import { heVerbFeaturesSchema } from "./lexeme/verb.js";
import { heCircumfixMorphemeFeaturesSchema } from "./morpheme/circumfix.js";
import { heCliticMorphemeFeaturesSchema } from "./morpheme/clitic.js";
import { heDuplifixMorphemeFeaturesSchema } from "./morpheme/duplifix.js";
import { heInfixMorphemeFeaturesSchema } from "./morpheme/infix.js";
import { heInterfixMorphemeFeaturesSchema } from "./morpheme/interfix.js";
import { hePrefixMorphemeFeaturesSchema } from "./morpheme/prefix.js";
import { heRootMorphemeFeaturesSchema } from "./morpheme/root.js";
import { heSuffixMorphemeFeaturesSchema } from "./morpheme/suffix.js";
import { heSuffixoidMorphemeFeaturesSchema } from "./morpheme/suffixoid.js";
import { heToneMarkingMorphemeFeaturesSchema } from "./morpheme/tone-marking.js";
import { heTransfixMorphemeFeaturesSchema } from "./morpheme/transfix.js";
import { heAphorismPhrasemeFeaturesSchema } from "./phraseme/aphorism.js";
import { heDiscourseFormulaPhrasemeFeaturesSchema } from "./phraseme/discourse-formula.js";
import { heIdiomPhrasemeFeaturesSchema } from "./phraseme/idiom.js";
import { heProverbPhrasemeFeaturesSchema } from "./phraseme/proverb.js";

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
