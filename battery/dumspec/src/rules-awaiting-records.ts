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
		rule: "de/bleiben-with-an-infinitive",
		issue: 700,
		why: "Three Draft records hold a verb + bleiben (der-alte-aufzug-bleibt-nie-zwischen-den-etagen-stehen, die-abk-blieb-stehen-obwohl-der-satz-ueberarbeitet-wurde, obwohl-der-wagen-am-morgen-noch-liegen-geblieben-war-hat-die) but no target for it; each gets one when #700 reshapes it, and the Rule then lists it.",
	},
];
