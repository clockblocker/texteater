/**
 * Reviewed authored content, model-free grammatical derivation and the
 * government selector over a stored Sentence Analysis.
 *
 * This entry point exists for hosts that run inside a database transaction or
 * another short-lived isolate: it reaches the authored catalog and the pure
 * selection helpers without loading Effect, promptsmith, or model execution.
 * The package root re-exports the same functions for callers that already
 * hold the full generation runtime.
 */
export {
	authoredReading as selectAuthoredReading,
	selectAuthoredArticle,
	selectGrammaticalAlternatives,
} from "./concrete-lang/de/authored-closed-sets/select.js";
export { deriveGrammaticalComponent } from "./concrete-lang/de/grammatical-resolution/components.js";
export {
	deriveNounArticle,
	nounArticleReference,
	selectNounHeadingArticle,
} from "./concrete-lang/de/grammatical-resolution/noun-article-reference.js";
export { governedPrepositionsAt } from "./concrete-lang/de/sentence-analysis/analysis.js";
export { DumgenFailure, type DumgenFailureTag } from "./universal/failure.js";
