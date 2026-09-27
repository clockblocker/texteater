/**
 * The Authored Inventories: closed-class units authored instead of generated,
 * each with its Reading and reviewed Reading Knowledge. German holds the AUX
 * Readings, the PRON and DET pillar cells and stems, and the pronominal
 * adverbs.
 *
 * This entry reads no files and loads neither Zod nor the record checks, so a
 * host inside a database transaction or another short-lived isolate can
 * import it (ADR 0025). The package root re-exports it.
 */
export { closedVerbForms } from "./inventories/de/closed-verb-paradigms.js";
export { reviewedDeterminers } from "./inventories/de/determiner-paradigms.js";
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
