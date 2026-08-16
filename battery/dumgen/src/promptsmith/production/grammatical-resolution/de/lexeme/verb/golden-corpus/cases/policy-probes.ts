import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-passive-participle-geschlossen": {
			input: {
				markedContext:
					"Die Tür <TARGET>wurde</TARGET> <TARGET>geschlossen</TARGET>.",
				members: ["wurde", "geschlossen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["wurde", "geschlossen"],
				memberOrthographies: ["Standard", "Standard"],
				canonicalForm: "schließen",
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: null,
				},
			}),
			explanation:
				"Productive werden-passive. wurde member. geschlossen head stays Part.",
		},
		"grammar-de-verb-state-passive-geschlossen": {
			input: {
				markedContext:
					"Die Tür <TARGET>ist</TARGET> <TARGET>geschlossen</TARGET>.",
				members: ["ist", "geschlossen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["ist", "geschlossen"],
				memberOrthographies: ["Standard", "Standard"],
				canonicalForm: "schließen",
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: null,
				},
			}),
			explanation:
				"TIGER productive state passive. ist member. geschlossen head stays Part under schließen.",
		},
		"grammar-de-verb-provisional-zu-infinitive-warten": {
			input: {
				markedContext: "Sie versucht zu <TARGET>warten</TARGET>.",
				members: ["warten"],
			},
			idealOutput: inflection({
				normalizedMembers: ["warten"],
				canonicalForm: "warten",
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
