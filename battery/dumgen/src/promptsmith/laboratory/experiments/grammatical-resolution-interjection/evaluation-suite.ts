import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/interjection/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/interjection/prompt-source";
import { evaluateInterjectionGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-intj-wupp-sound-effect",
	"grammar-de-intj-hallo-greeting",
	"grammar-de-intj-hurra-joy",
	"grammar-de-intj-oh-reaction",
	"grammar-de-intj-huch-surprise",
	"grammar-de-intj-au-pain",
	"grammar-de-intj-aeh-hesitation",
	"grammar-de-intj-tja-resignation",
	"grammar-de-intj-miau-sound",
	"grammar-de-intj-nein-response",
	"grammar-de-intj-doch-corrective-response",
	"grammar-de-intj-sentence-initial-ach",
	"grammar-de-intj-typo-huraa",
	"grammar-de-intj-unresolved-modal-particle-ja",
	"grammar-de-intj-unresolved-na-ja-formula",
	"grammar-de-intj-unresolved-nominalized-ach",
	"grammar-de-intj-unresolved-overbroad-formula",
	"grammar-de-intj-unresolved-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"INTJ Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const interjectionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateInterjectionGrammaticalResolution,
});
