import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/reading-resolution/de/golden-corpus/corpus";
import { promptSource } from "../../prompt-source/reading-resolution/de/prompt-source";
import { evaluateReadingResolution } from "./evaluator";

const evaluation = corpus.select([
	"reading-de-scharf-spicy",
	"reading-de-adp-vor-cause",
	"reading-de-lexeme-adv-sonst-usual",
	"reading-de-lexeme-aux-werden-passive",
	"reading-de-lexeme-cconj-aber-contrast-reuse",
	"reading-de-lexeme-det-dieser-demonstrative-reuse",
	"reading-de-lexeme-intj-hurra-celebration-new",
	"reading-de-bank-financial",
	"reading-de-lexeme-num-drei-cardinal-reuse",
	"reading-de-lexeme-part-nicht-negation-reuse",
	"reading-de-lexeme-pron-jemand-person-reuse",
	"reading-de-lexeme-propn-berlin-city-reuse",
	"reading-de-lexeme-sconj-waehrend-adversative",
	"reading-de-lexeme-sym-euro-currency-reuse",
	"reading-de-lexeme-verb-laufen-operate-reuse",
	"reading-de-lexeme-x-lol-laughter-reuse",
	"reading-de-phraseme-aphorism-zeit-ist-geld",
	"reading-de-phraseme-collocation-entscheidung-treffen-reuse",
	"reading-de-phraseme-discourse-formula-das-tut-mir-leid-sympathy",
	"reading-de-phraseme-idiom-den-faden-verlieren",
	"reading-de-phraseme-proverb-viele-koeche",
	"reading-de-construction-fusion-am-temporal",
	"reading-de-construction-paired-frame-entweder-oder",
]);

export const readingResolutionGauntlet = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateReadingResolution,
});
