import type { RuleAwaitingRecords } from "./check-rules.js";

/**
 * The Rules allowed to list no record for now (#741). An entry naming
 * showing records waits only for the Rule to link them; remove it when the
 * Rule does.
 */
export const rulesAwaitingRecords: readonly RuleAwaitingRecords[] = [
	{
		rule: "de/unresolved-over-repair",
		issue: 725,
		why: "Gold always decides contested membership, and a contested unit goes to the user for a ruling (#743), so only a truly undecidable record can show this Rule; #725's haben + participle is the likely first.",
	},
	{
		rule: "de/was-fuer",
		issue: 741,
		why: "No record shows it: it needs Draft records for standalone was für einer (PRON) and was für ein before a noun (DET), one split across the sentence.",
	},
];
