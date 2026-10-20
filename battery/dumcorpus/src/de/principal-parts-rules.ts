import type { Rule } from "../corpus-types.js";
import { lexeme } from "./rules.js";

/**
 * The German Rules on a verb's principal parts (ADR 0038, #1217). They sit
 * apart from `rules.ts`, which is past the file-token limit.
 */
export const principalPartsRules: readonly Rule[] = [
	{
		id: "de/principal-parts-as-the-dictionary-cites",
		statement:
			"A VERB Reading stores its principal parts in this sense as Duden or DWDS cites them: the Präsens of each singular person, the Partizip II and the third person singular Konjunktiv II, beside its Präteritum. A separable verb's finite forms split off the particle (wäscht ab, wüsche ab) and its Partizip II is one word (abgewaschen); no form holds sich. A verb whose first syllable is unstressed takes no ge- (etabliert). A Weak verb's Konjunktiv II is its Präteritum; a Strong or Mixed verb's is not (wäre, müsste, verbrennte). An Ersatzinfinitiv (hat … lassen) is no Partizip II.",
		adrs: ["ADR-0038"],
		routes: lexeme("VERB"),
		records: [
			"de/nach-dem-training-waescht-lea-sich-die-haende",
			"de/er-stieg-aus-und-gleich-wieder-ein",
			"de/die-weltordnung-die-sich-nach-dem-zweiten-weltkrieg",
			"de/verbrannt-ist-alles-ganz-und-gar",
			"de/er-muss-heute-arbeiten",
		],
	},
];
