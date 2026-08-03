import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/construction/paired-frame/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source";
import { evaluatePairedFrameGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-paired-frame-entweder-oder-friday",
	"grammar-de-paired-frame-entweder-oder-clauses",
	"grammar-de-paired-frame-weder-noch-nouns",
	"grammar-de-paired-frame-sowohl-wie",
	"grammar-de-paired-frame-je-umso-night",
	"grammar-de-paired-frame-je-desto",
	"grammar-de-paired-frame-je-umso",
	"grammar-de-paired-frame-um-zu-learn",
	"grammar-de-paired-frame-um-zu-purpose",
	"grammar-de-paired-frame-ohne-zu",
	"grammar-de-paired-frame-entweder-typo",
	"grammar-de-paired-frame-desto-typo",
	"grammar-de-paired-frame-unresolved-single-arm-entweder",
	"grammar-de-paired-frame-unresolved-single-arm-noch",
	"grammar-de-paired-frame-unresolved-overselected-conjunct",
	"grammar-de-paired-frame-unresolved-mixed-occurrences",
	"grammar-de-paired-frame-unresolved-unrelated-um-zu",
	"grammar-de-paired-frame-unresolved-mismatched-arms",
	"grammar-de-paired-frame-unresolved-single-cconj-sowie",
	"grammar-de-paired-frame-unresolved-unmarked-third-member",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PairedFrame Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const pairedFrameGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluatePairedFrameGrammaticalResolution,
});
