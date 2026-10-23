import type { RuleAwaitingRecords } from "./check-rules.js";

/**
 * The Rules allowed to list no record for now (#741). An entry naming
 * showing records waits only for the Rule to link them; remove it when the
 * Rule does.
 */
export const rulesAwaitingRecords: readonly RuleAwaitingRecords[] = [
	{
		rule: "de/formation-names-its-source",
		issue: 1241,
		why: "Its cases are Breakdown Records (lauf), which a Rule can't list yet; a sentence record with a conversion, clipping or acronym Source shows it once one is authored.",
	},
];
