/**
 * The Authored Inventories: closed-class units authored instead of generated,
 * each with its Reading and reviewed Reading Knowledge. ADR 0021 decides which
 * units belong in one. Each language's inventory lives in its own directory,
 * such as `src/inventories/de/`, and registers in `inventories/registry.ts`,
 * which the language-generic selectors and `authoredMembers` read.
 *
 * This entry exports the authored members and their realizations, the
 * reviewed pronoun and determiner paradigms, the closed verb forms and their
 * participles, the clitic spellings of es, and the reflexive drill-down.
 * The authored members include the pronoun
 * Syncretisms generated from the pronoun cells (system ADR 0046). It also
 * exports German lookups: the ADP Case Table, its governable prepositions and
 * its Valency Frame check, the conjunction Locutions the Rules cite, the der
 * or ein cell an article derives to, the nouns with no singular, the
 * Syncretism a classifier's answer names and the stem Surface Syncretisms.
 * Its language-generic selectors find the authored member of a Lemma or
 * Reading and tell a Closed Route (system ADR 0021); its German ones step between Paradigm Cells (system ADR 0019) and derive the
 * grammatical component a Surface brings without a model. `checkIfGrundform`
 * assesses a Surface's Grundform by each language's citation conventions
 * (dumcorpus ADR 0001).
 *
 * This entry reads no files and loads neither Zod nor the other record
 * checks, so a host inside a database transaction or another short-lived
 * isolate can import it (ADR 0025). Of its dependencies it loads only
 * Dumling's runtime root, which is light in the same way. The package root
 * re-exports it.
 */

export {
	type AdpositionCaseIssue,
	frameAdpositionCaseIssues,
} from "./de/check-adposition-cases.js";
export { checkIfGrundform } from "./grundform/check-if-grundform.js";
export { GrundformAssessmentError } from "./grundform/result.js";
export {
	type GermanAdpositionCase,
	type GermanAdpositionCases,
	type GermanAdpositionEntry,
	type GermanAdpositionPosition,
	type GermanAdpositionPositions,
	germanAdpositionAllowedCases,
	germanAdpositionAllows,
	germanAdpositionEntry,
	germanGovernablePrepositions,
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
	closedVerbParticiples,
	modalVerbs,
} from "./inventories/de/closed-verb-paradigms.js";
export { germanConjunctionLocutions } from "./inventories/de/conjunction-locutions.js";
export { reviewedDeterminers } from "./inventories/de/determiner-paradigms.js";
export {
	reflexiveDrillDown,
	reflexivityUnit,
} from "./inventories/de/drill-down.js";
export { cliticEsSpellings } from "./inventories/de/expletive-spellings.js";
export {
	authoredComponent,
	deriveGrammaticalComponent,
	type GrammaticalComponent,
} from "./inventories/de/grammatical-components.js";
export { selectGrammaticalAlternatives } from "./inventories/de/grammatical-navigation.js";
export { member as subjectExpletiveEs } from "./inventories/de/members/lexeme/pronoun/personal/es-subject-expletive.js";
export {
	germanParticleMember,
	germanParticles,
} from "./inventories/de/particles.js";
export {
	germanPluralOnlyNouns,
	isGermanPluralOnlyNoun,
} from "./inventories/de/plural-only-nouns.js";
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
export {
	referentCanLeaveOpen,
	type StemSyncretism,
	stemSyncretismFor,
	stemSyncretisms,
} from "./inventories/de/surface-syncretisms.js";
export { syncretismFor } from "./inventories/de/syncretisms.js";
export type { AuthoredMember } from "./inventories/member.js";
export { authoredMembers } from "./inventories/registry.js";
export {
	authoredFor,
	authoredReading,
	closedRoute,
	selectAuthoredArticle,
} from "./inventories/selection.js";
