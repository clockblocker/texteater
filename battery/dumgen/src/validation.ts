/**
 * Encounter validation without the generation runtime.
 *
 * `validateEncounter` keeps its frozen package-root contract; this entry point
 * adds a second, lighter location for hosts that only need to check a stored
 * Encounter before running a database transaction.
 */
export { DumgenFailure, type DumgenFailureTag } from "./universal/failure.js";
export { validateEncounter } from "./universal/validation.js";
