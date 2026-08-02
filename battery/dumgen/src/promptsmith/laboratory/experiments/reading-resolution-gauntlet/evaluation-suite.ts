import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/reading-resolution/de/golden-corpus/corpus";
import { promptSource } from "../../prompt-source/reading-resolution/de/prompt-source";
import { evaluateReadingResolution } from "./evaluator";

const evaluation = corpus.select([
	"reading-de-bank-financial",
	"reading-de-key-metaphor",
	"reading-de-bank-park-bench",
	"reading-de-aufstehen-morning-six",
	"reading-de-maus-computer",
	"reading-de-idiom-mit-den-woelfen-heulen",
	"reading-de-leitung-management",
	"reading-de-scharf-spicy",
	"reading-de-scharf-sharp",
	"reading-de-absatz-paragraph",
	"reading-de-lexeme-adv-sonst-usual",
	"reading-de-lexeme-aux-werden-passive",
	"reading-de-lexeme-sconj-waehrend-adversative",
	"reading-de-phraseme-discourse-formula-das-tut-mir-leid-sympathy",
	"reading-de-phraseme-aphorism-zeit-ist-geld",
	"reading-de-phraseme-proverb-viele-koeche",
	"reading-de-phraseme-idiom-den-faden-verlieren",
	"reading-de-morpheme-prefix-un-intensifier",
	"reading-de-morpheme-suffix-chen-smallness",
	"reading-de-morpheme-suffixoid-frei-absence",
	"reading-de-morpheme-circumfix-ge-t-participle",
	"reading-de-construction-fusion-am-temporal",
	"reading-de-construction-paired-frame-entweder-oder",
]);

export const readingResolutionGauntlet = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateReadingResolution,
});
