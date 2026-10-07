/**
 * The Authored Inventories: closed-class units authored instead of generated,
 * each with its Reading and reviewed Reading Knowledge. ADR 0021 decides which
 * units belong in one. Each language's inventory lives in its own directory,
 * such as `src/inventories/de/`, and registers in `inventories/registry.ts`,
 * which the language-generic selectors and `authoredMembers` read.
 *
 * This entry exports the authored members and their realizations, the closed
 * verb forms, their participles and the modal verbs, the clitic spellings of
 * es, the separable and inseparable verb prefixes, the colloquial r- and dr-
 * adverb shorthands, the suppletive comparisons, the Surface features each
 * AUX use sets, and the reviewed fusions, apostrophe clitics and
 * abbreviations. The authored members include the pronoun Syncretisms
 * generated from the pronoun cells (system ADR 0046). It also exports German
 * lookups: the ADP Case Table, its governable prepositions and its Valency
 * Frame check, the conjunction Locutions the Rules cite, the der or ein cell
 * an article derives to, the test for nouns with no singular and the stem
 * Surface Syncretisms. Its language-generic selectors find the authored
 * member of a Lemma or Reading and tell a Closed Route (system ADR 0021); its
 * German ones step between Paradigm Cells (system ADR 0019) and derive the
 * grammatical component a Surface brings without a model. `checkIfGrundform`
 * assesses a Surface's Grundform by each language's citation conventions
 * (dumcorpus ADR 0001).
 *
 * This entry reads no files and loads neither Zod nor the other record
 * checks, so a host inside a database transaction or another short-lived
 * isolate can import it (ADR 0025). Of its dependencies it loads only
 * Dumling's runtime root, which is light in the same way. It exports only
 * the names other workspaces read, and the package root re-exports only the
 * ones its callers read.
 */

export { frameAdpositionCaseIssues } from "./de/check-adposition-cases.js";
export { checkIfGrundform } from "./grundform/check-if-grundform.js";
export {
	type GermanAdpositionCases,
	type GermanAdpositionPosition,
	germanAdpositionAllowedCases,
	germanAdpositionAllows,
	germanAdpositionEntry,
	germanGovernablePrepositions,
} from "./inventories/de/adposition-cases.js";
export {
	type GermanAdverbShorthandSeries,
	germanAdverbShorthands,
} from "./inventories/de/adverb-shorthands.js";
export {
	type ArticleMember,
	germanArticleCell,
	germanArticleSpellings,
} from "./inventories/de/article-cells.js";
export { auxiliarySurfaceFeatures } from "./inventories/de/auxiliary-surface-features.js";
export {
	closedVerbForms,
	closedVerbParticiples,
	modalVerbs,
} from "./inventories/de/closed-verb-paradigms.js";
export { germanConjunctionLocutions } from "./inventories/de/conjunction-locutions.js";
export { cliticEsSpellings } from "./inventories/de/expletive-spellings.js";
export {
	germanAbbreviations,
	germanClitics,
	germanFusions,
} from "./inventories/de/fusions.js";
export {
	authoredComponent,
	deriveGrammaticalComponent,
	type GrammaticalComponent,
} from "./inventories/de/grammatical-components.js";
export { selectGrammaticalAlternatives } from "./inventories/de/grammatical-navigation.js";
export {
	germanParticleMember,
	germanParticles,
} from "./inventories/de/particles.js";
export { isGermanPluralOnlyNoun } from "./inventories/de/plural-only-nouns.js";
export {
	type AuthoredRealization,
	authoredRealizations,
} from "./inventories/de/realizations.js";
export { germanSuppletiveComparisons } from "./inventories/de/suppletive-comparison.js";
export {
	referentCanLeaveOpen,
	type StemSyncretism,
	stemSyncretisms,
} from "./inventories/de/surface-syncretisms.js";
export {
	germanInseparablePrefixes,
	germanSeparablePrefixes,
} from "./inventories/de/verb-prefixes.js";
export type { AuthoredMember } from "./inventories/member.js";
export { authoredMembers } from "./inventories/registry.js";
export {
	authoredFor,
	authoredReading,
	closedRoute,
	selectAuthoredArticle,
} from "./inventories/selection.js";
