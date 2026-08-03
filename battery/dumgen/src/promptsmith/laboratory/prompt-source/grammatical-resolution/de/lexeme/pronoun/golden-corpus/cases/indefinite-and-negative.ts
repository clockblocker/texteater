import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, core, inflection } from "./builders";

export const indefiniteAndNegativeCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-indefinite-jemanden": {
				input: {
					markedContext: "Wir suchen <TARGET>jemanden</TARGET>.",
				},
				idealOutput: inflection({
					normalizedSurface: "jemanden",
					canonicalForm: "jemand",
					coreFeatures: core("Ind"),
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: "Sing",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-indefinite-etwas": {
				input: { markedContext: "Ich sehe <TARGET>etwas</TARGET>." },
				idealOutput: citation({
					normalizedSurface: "etwas",
					canonicalForm: "etwas",
					coreFeatures: core("Ind"),
				}),
			},
			"grammar-de-pron-negative-niemandem": {
				input: {
					markedContext: "Ich helfe <TARGET>niemandem</TARGET>.",
				},
				idealOutput: inflection({
					normalizedSurface: "niemandem",
					canonicalForm: "niemand",
					coreFeatures: core("Neg"),
					inflectionalFeatures: {
						case: "Dat",
						gender: null,
						number: "Sing",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-negative-nichts": {
				input: { markedContext: "Ich sehe <TARGET>nichts</TARGET>." },
				idealOutput: citation({
					normalizedSurface: "nichts",
					canonicalForm: "nichts",
					coreFeatures: core("Neg"),
				}),
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
