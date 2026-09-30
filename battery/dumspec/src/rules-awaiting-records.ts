import type { RuleAwaitingRecords } from "./check-rules.js";

/**
 * The Rules allowed to list no record for now (#741). An entry naming
 * showing records waits only for the Rule to link them; remove it when the
 * Rule does.
 */
export const rulesAwaitingRecords: readonly RuleAwaitingRecords[] = [
	{
		rule: "de/unresolved-over-repair",
		issue: 743,
		findings: ["K-A4"],
		why: "No Target admits only unintelligible, nonce, broken-off or suspended-compound material, so no record can hold a contested unit until #743 rules.",
	},
	{
		rule: "de/was-fuer",
		issue: 741,
		why: "No record shows it: it needs Draft records for standalone was für einer (PRON) and was für ein before a noun (DET), one split across the sentence.",
	},
];
