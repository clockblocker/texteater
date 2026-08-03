import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/phraseme/proverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/phraseme/proverb/prompt-source";
import { evaluateProverbGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-proverb-andere-laender",
	"grammar-de-proverb-ende-gut",
	"grammar-de-proverb-uebung-meister",
	"grammar-de-proverb-viele-koeche",
	"grammar-de-proverb-grube",
	"grammar-de-proverb-zuletzt-lacht",
	"grammar-de-proverb-stille-wasser",
	"grammar-de-proverb-gelegenheit-diebe",
	"grammar-de-proverb-apfel-stamm",
	"grammar-de-proverb-kleinvieh",
	"grammar-de-proverb-luegen-beine",
	"grammar-de-proverb-reden-silber",
	"grammar-de-proverb-wer-rastet",
	"grammar-de-proverb-unresolved-aphorism-nachahmer",
	"grammar-de-proverb-unresolved-idiom",
	"grammar-de-proverb-unresolved-discourse-formula",
	"grammar-de-proverb-unresolved-arbitrary-quotation",
	"grammar-de-proverb-unresolved-partial",
	"grammar-de-proverb-unresolved-overbroad-attribution",
	"grammar-de-proverb-unresolved-two-whole-units",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"Proverb Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const proverbGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateProverbGrammaticalResolution,
});
