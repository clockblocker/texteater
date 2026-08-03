import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, core, inflection } from "./builders";

export const reflexiveAndReciprocalCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-reflexive-sich": {
				input: { markedContext: "Er wäscht <TARGET>sich</TARGET>." },
				idealOutput: inflection({
					normalizedSurface: "sich",
					canonicalForm: "sich",
					coreFeatures: core("Prs", { person: "3" }),
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: null,
						reflex: "Yes",
					},
				}),
			},
			"grammar-de-pron-nonreflexive-mich": {
				input: { markedContext: "Sie sieht <TARGET>mich</TARGET>." },
				idealOutput: inflection({
					normalizedSurface: "mich",
					canonicalForm: "ich",
					coreFeatures: core("Prs", { person: "1" }),
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: "Sing",
						reflex: null,
					},
				}),
				contaminationKeys: ["de-pron-reflex:mich-context"],
			},
			"grammar-de-pron-reflexive-mich": {
				input: { markedContext: "Ich wasche <TARGET>mich</TARGET>." },
				idealOutput: inflection({
					normalizedSurface: "mich",
					canonicalForm: "ich",
					coreFeatures: core("Prs", { person: "1" }),
					inflectionalFeatures: {
						case: "Acc",
						gender: null,
						number: "Sing",
						reflex: "Yes",
					},
				}),
				contaminationKeys: ["de-pron-reflex:mich-context"],
			},
			"grammar-de-pron-reciprocal-einander": {
				input: {
					markedContext: "Sie begrüßten <TARGET>einander</TARGET>.",
				},
				idealOutput: citation({
					normalizedSurface: "einander",
					canonicalForm: "einander",
					coreFeatures: core("Rcp"),
				}),
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
