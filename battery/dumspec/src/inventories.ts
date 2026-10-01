/**
 * The Authored Inventories: closed-class units authored instead of generated,
 * each with its Reading and reviewed Reading Knowledge. German holds the AUX
 * Readings, the PRON and DET pillar cells and stems, the reflexivity unit a
 * reflexive drills down to, the pronominal adverbs, and the interrogative and
 * relative w-adverbs (wo, wann, wie, warum). It also holds the German ADP
 * Case Table, the positions and cases each adposition takes, the list of
 * conjunction Locutions its Rules cite, and derives an article's der or ein
 * cell from its spelling and its Head's agreement.
 *
 * This entry reads no files and loads neither Zod nor the record checks, so a
 * host inside a database transaction or another short-lived isolate can
 * import it (ADR 0025). The package root re-exports it.
 */

export {
	type GermanAdpositionCase,
	type GermanAdpositionCases,
	type GermanAdpositionEntry,
	type GermanAdpositionPosition,
	type GermanAdpositionPositions,
	germanAdpositionAllowedCases,
	germanAdpositionAllows,
	germanAdpositionEntry,
} from "./inventories/de/adposition-cases.js";
export {
	type ArticleAgreement,
	type ArticleMember,
	germanArticleCell,
	germanArticleSpellings,
} from "./inventories/de/article-cells.js";
export { closedVerbForms } from "./inventories/de/closed-verb-paradigms.js";
export { germanConjunctionLocutions } from "./inventories/de/conjunction-locutions.js";
export { reviewedDeterminers } from "./inventories/de/determiner-paradigms.js";
export {
	reflexiveDrillDown,
	reflexivityUnit,
} from "./inventories/de/drill-down.js";
export { authoredMembers } from "./inventories/de/inventory.js";
export type { AuthoredMember } from "./inventories/de/member.js";
export { member as subjectExpletiveEs } from "./inventories/de/members/lexeme/pronoun/personal/es-subject-expletive.js";
export { reviewedPronouns } from "./inventories/de/pronoun-paradigms.js";
export {
	type AuthoredRealization,
	authoredRealizations,
} from "./inventories/de/realizations.js";
export type {
	AuthoredSpelling,
	ReviewedMember,
	SurfaceCell,
} from "./inventories/de/stem-lemma.js";
