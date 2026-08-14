import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-provisional-passive-participle-geschlossen": {
			input: {
				markedContext: "Die Tür wurde <TARGET>geschlossen</TARGET>.",
				members: ["geschlossen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["geschlossen"],
				canonicalForm: "schließen",
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: "Pass",
				},
			}),
			explanation: "Passive reading. geschlossen head. voice Pass.",
		},
		"grammar-de-verb-provisional-predicative-geschlossen": {
			input: {
				markedContext: "Die Tür ist <TARGET>geschlossen</TARGET>.",
				members: ["geschlossen"],
			},
			idealOutput: inflection({
				normalizedMembers: ["geschlossen"],
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
			explanation: "Predicative reading. Treat as verbal Part, not ADJ.",
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
