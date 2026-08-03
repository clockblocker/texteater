import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/phraseme/collocation/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { evaluateCollocationGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-coll-antrag-present-full",
	"grammar-de-coll-antrag-past-full",
	"grammar-de-coll-kritik-present-full",
	"grammar-de-coll-hilfe-plural-full",
	"grammar-de-coll-abschied-past-full",
	"grammar-de-coll-massnahmen-present-full",
	"grammar-de-coll-stellung-imperative-full",
	"grammar-de-coll-anspruch-participle-full",
	"grammar-de-coll-ausdruck-infinitive-full",
	"grammar-de-coll-einfluss-present-full",
	"grammar-de-coll-rolle-modified-full",
	"grammar-de-coll-anspruch-partial",
	"grammar-de-coll-kritik-citation",
	"grammar-de-coll-hilfe-typo",
	"grammar-de-coll-unresolved-idiom-loeffel",
	"grammar-de-coll-unresolved-construction-je-desto",
	"grammar-de-coll-unresolved-verb-only-antrag",
	"grammar-de-coll-unresolved-overbroad-clause",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"Collocation Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const collocationGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateCollocationGrammaticalResolution,
});
