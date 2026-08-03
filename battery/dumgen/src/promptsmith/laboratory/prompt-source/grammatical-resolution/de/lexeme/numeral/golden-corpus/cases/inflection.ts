import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-inflected-millionen": {
			input: {
				markedContext:
					"Mit <TARGET>Millionen</TARGET> rechnet niemand.",
			},
			idealOutput: inflection({
				normalizedSurface: "Millionen",
				canonicalForm: "Million",
				case: "Dat",
				gender: "Fem",
				number: "Plur",
			}),
			explanation:
				"German GSD annotates inflected quantity nouns such as Millionen as NUM; mit establishes dative feminine plural agreement.",
			contaminationKeys: ["de-num-form:inflected-large-cardinal"],
		},
		"grammar-de-num-inflected-milliarden": {
			input: {
				markedContext: "Von <TARGET>Milliarden</TARGET> träumt sie.",
			},
			idealOutput: inflection({
				normalizedSurface: "Milliarden",
				canonicalForm: "Milliarde",
				case: "Dat",
				gender: "Fem",
				number: "Plur",
			}),
			contaminationKeys: ["de-num-form:inflected-large-cardinal"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
