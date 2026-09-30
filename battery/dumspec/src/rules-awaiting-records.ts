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
		rule: "de/recipient-passive",
		issue: 741,
		why: "Records show it; the Rule has yet to link them. Two Drafts contradict it: de/sie-bekommt-das-paket-geliefert and de/er-kriegt-alles-erklaert make bekommt or kriegt an AUX target of its own.",
		showing: [
			"de/sie-bekommt-das-paket-geliefert-2",
			"de/der-preistraeger-erhielt-die-urkunde-ueberreicht",
			"de/sie-bekommt-ein-paket",
			"de/sie-bekommt-das-glas-endlich-geoeffnet",
		],
	},
	{
		rule: "de/shared-article-in-coordination",
		issue: 741,
		why: "Records show it; the Rule has yet to link them.",
		showing: [
			"de/der-aufstieg-und-abstieg",
			"de/der-aufstieg-und-abstieg-und-umstieg",
			"de/der-aufstieg-und-der-abstieg",
		],
	},
	{
		rule: "de/suspended-compound-completion",
		issue: 741,
		why: "Records show it; the Rule has yet to link them.",
		showing: [
			"de/kinder-und-jugendbuecher-sind-beliebt",
			"de/sie-verkauft-kinder-und-jugendbuecher",
			"de/sie-kauft-ein-kinder-oder-jugendbuch",
			"de/auf-dem-zettel-steht-kinder",
		],
	},
	{
		rule: "de/was-fuer",
		issue: 741,
		why: "No record shows it: it needs Draft records for standalone was für einer (PRON) and was für ein before a noun (DET), one split across the sentence.",
	},
];
