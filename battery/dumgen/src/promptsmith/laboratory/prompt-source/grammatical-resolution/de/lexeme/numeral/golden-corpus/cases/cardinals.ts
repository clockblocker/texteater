import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation } from "./builders";

export const cardinalCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-word-vier": {
			input: { markedContext: "Sie kauft <TARGET>vier</TARGET> Hefte." },
			idealOutput: citation({ normalizedMembers: ["vier"] }),
			explanation:
				"A definite cardinal written as a word is NUM with NumType=Card; the uninflected Surface is Citation under the exact codec.",
			contaminationKeys: ["de-num-form:ordinary-word-cardinal"],
		},
		"grammar-de-num-digit-7": {
			input: {
				markedContext: "Auf dem Schild steht <TARGET>7</TARGET>.",
			},
			idealOutput: citation({ normalizedMembers: ["7"] }),
			explanation:
				"A digit used as a number is a cardinal NUM. The codec has no NumForm field, so the digit is its own canonical form rather than being rewritten as a word.",
			contaminationKeys: ["de-num-form:digit-cardinal"],
		},
		"grammar-de-num-roman-xiv": {
			input: { markedContext: "Römische Zahl: <TARGET>XIV</TARGET>" },
			idealOutput: citation({ normalizedMembers: ["XIV"] }),
			explanation:
				"The explicit numerical label makes the Roman numeral a cardinal NUM rather than a proper-name component.",
			contaminationKeys: ["de-num-form:roman-cardinal"],
		},
		"grammar-de-num-word-zwei": {
			input: { markedContext: "Wir sehen <TARGET>zwei</TARGET> Boote." },
			idealOutput: citation({ normalizedMembers: ["zwei"] }),
			contaminationKeys: ["de-num-form:ordinary-word-cardinal"],
		},
		"grammar-de-num-digit-42": {
			input: { markedContext: "Die Lösung lautet <TARGET>42</TARGET>." },
			idealOutput: citation({ normalizedMembers: ["42"] }),
			contaminationKeys: ["de-num-form:digit-cardinal"],
		},
		"grammar-de-num-roman-ix": {
			input: { markedContext: "Römische Zahl: <TARGET>IX</TARGET>" },
			idealOutput: citation({ normalizedMembers: ["IX"] }),
			explanation:
				"Universal UD treats Roman numerals as NUM when they denote a number; the explicit label rules out a name component.",
			contaminationKeys: ["de-num-form:roman-cardinal"],
		},
		"grammar-de-num-year-2024": {
			input: { markedContext: "Das geschah <TARGET>2024</TARGET>." },
			idealOutput: citation({ normalizedMembers: ["2024"] }),
			contaminationKeys: ["de-num-form:year-cardinal"],
		},
		"grammar-de-num-anderthalb": {
			input: {
				markedContext:
					"Die Fahrt dauert <TARGET>anderthalb</TARGET> Stunden.",
			},
			idealOutput: citation({ normalizedMembers: ["anderthalb"] }),
			contaminationKeys: ["de-num-form:fractional-word-cardinal"],
		},
		"grammar-de-num-citation-hundert": {
			input: {
				markedContext:
					"Wörterbucheintrag Numerale: <TARGET>hundert</TARGET>",
			},
			idealOutput: citation({ normalizedMembers: ["hundert"] }),
			contaminationKeys: ["de-num-surface:dictionary-citation"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
