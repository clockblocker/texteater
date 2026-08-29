/**
 * Action-level Shared Demo Dictionary persistence seam.
 *
 * Actions use the Dumdict storage port through Convex query and mutation
 * adapters. Mutation-local callers must use `dumdictTransaction.ts` so their
 * dictionary writes remain atomic with the surrounding host transaction.
 */
export { createConvexDumdictStorage } from "./dumdictStorage/adapter";
export {
	type DictionaryPlanResult,
	dictionaryPlanResult,
} from "./dumdictStorage/dictionaryPlan";
