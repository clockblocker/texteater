/**
 * The Authored Inventories: closed-class units authored instead of generated,
 * each with its Reading and reviewed Reading Knowledge. ADR 0021 decides which
 * units belong in one. The German inventories live in `src/inventories/de/`.
 *
 * This entry exports the authored members and their realizations, the
 * reviewed pronoun and determiner paradigms, the closed verb forms, and the
 * reflexive drill-down. It also exports German lookups: the ADP Case Table,
 * the conjunction Locutions the Rules cite, and the der or ein cell an article
 * derives to.
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
export {
	closedVerbFormSpellings,
	closedVerbForms,
	modalVerbs,
} from "./inventories/de/closed-verb-paradigms.js";
export { germanConjunctionLocutions } from "./inventories/de/conjunction-locutions.js";
export { reviewedDeterminers } from "./inventories/de/determiner-paradigms.js";
export {
	reflexiveDrillDown,
	reflexivityUnit,
} from "./inventories/de/drill-down.js";
export { authoredMembers } from "./inventories/de/inventory.js";
export type { AuthoredMember } from "./inventories/de/member.js";
export { member as subjectExpletiveEs } from "./inventories/de/members/lexeme/pronoun/personal/es-subject-expletive.js";
export {
	germanParticleMember,
	germanParticles,
} from "./inventories/de/particles.js";
export { reviewedPronouns } from "./inventories/de/pronoun-paradigms.js";
export {
	type AuthoredRealization,
	authoredRealizations,
	type RealizationSpelling,
} from "./inventories/de/realizations.js";
export type {
	AuthoredSpelling,
	ReviewedMember,
	SurfaceCell,
} from "./inventories/de/stem-lemma.js";
