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
export { draftKnowledge } from "./concrete-lang/de/knowledge-production/draft.js";
export {
	effectiveRoute,
	familyOf,
	fixednessFloor,
	fusionAt,
	governedPrepositionsAt,
	governorTargets,
	headOf,
	largestOf,
	membersOf,
	offsetsOf,
	phrasemeOf,
	resolvedUnitAt,
	resolvedWordAt,
	segmentAt,
	selectIdentity,
	selectPhrasemeKind,
	selectRoute,
	targetOf,
} from "./concrete-lang/de/sentence-analysis/analysis.js";
export type {
	Dumgen,
	DumgenOptions,
	ModelExecutor,
} from "./types.js";
export { createDumgen } from "./universal/dumgen.js";
export { DumgenFailure, type DumgenFailureTag } from "./universal/failure.js";
export { validateEncounter } from "./universal/validation.js";
