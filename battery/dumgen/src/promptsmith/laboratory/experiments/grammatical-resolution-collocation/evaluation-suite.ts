import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/phraseme/collocation/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { evaluateCollocationGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-coll-antrag-present-full",
	"grammar-de-coll-antrag-past-full",
	"grammar-de-coll-vereinbarung-present-full",
	"grammar-de-coll-abbitte-plural-full",
	"grammar-de-coll-abschied-past-full",
	"grammar-de-coll-zustimmung-present-full",
	"grammar-de-coll-ende-imperative-full",
	"grammar-de-coll-anspruch-participle-full",
	"grammar-de-coll-ausdruck-infinitive-full",
	"grammar-de-coll-einfluss-present-full",
	"grammar-de-coll-erscheinung-modified-full",
	"grammar-de-coll-abschied-citation",
	"grammar-de-coll-abbitte-typo",
	"grammar-de-coll-unresolved-idiom-loeffel",
	"grammar-de-coll-unresolved-construction-je-desto",
	"grammar-de-coll-unresolved-verb-only-antrag",
	"grammar-de-coll-unresolved-mixed-occurrences",
	"grammar-de-coll-unresolved-marked-dependent",
	"grammar-de-coll-unresolved-elliptic-kenntnis",
	"grammar-de-coll-unresolved-present-member-unmarked",
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
